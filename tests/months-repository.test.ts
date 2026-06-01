import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { buildMonthRange, getMonthDetail, getMonthSnapshot, listMonthTimeline } = await import(
  "@/src/months/repository"
);

describe("months repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("builds a gapless descending month range", () => {
    expect(buildMonthRange("2031-01", "2031-04")).toEqual([
      "2031-04",
      "2031-03",
      "2031-02",
      "2031-01",
    ]);
  });

  it("lists months from first activity until current month including gaps", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'income', '2031-01-05', '2031-01', 120000, 'EUR', 'Test Salary', 'manual', NULL, NULL)
      `,
    ).run(sparkasseId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-03-10', '2031-03', -1200, 'EUR', 'Test Expense', 'import', NULL, NULL)
      `,
    ).run(sparkasseId);

    const months = listMonthTimeline("2031-04");

    expect(months.map((month) => month.monthKey)).toEqual([
      "2031-04",
      "2031-03",
      "2031-02",
      "2031-01",
    ]);
    expect(months.every((month) => month.detailHref === `/monate/${month.monthKey}`)).toBe(true);
    expect(months.find((month) => month.monthKey === "2031-02")?.incomeCents).toBe(0);
    expect(months.find((month) => month.monthKey === "2031-03")?.variableExpenseCents).toBe(
      1200,
    );
  });

  it("builds month detail with previous/next navigation and full transaction list", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    const specialBudgetId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
            VALUES ('Test Special', '2031-03', 5000, 'Test', 1)
          `,
        )
        .run().lastInsertRowid,
    );

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-03-11', '2031-03', -2100, 'EUR', 'Manual Category', 'manual', ?, NULL)
      `,
    ).run(sparkasseId, einkaufId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-03-12', '2031-03', -1400, 'EUR', 'Manual Special', 'manual', NULL, ?)
      `,
    ).run(sparkasseId, specialBudgetId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, ?, 'transfer', '2031-03-13', '2031-03', -5000, 'EUR', 'Cash Transfer', 'manual', NULL, NULL)
      `,
    ).run(sparkasseId, bargeldId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, counterparty_name, source_type, category_id, special_budget_id, import_run_id
        ) VALUES (?, NULL, 'expense', '2031-03-14', '2031-03', -3300, 'EUR', 'Imported Expense', 'Shop', 'import', NULL, NULL, NULL)
      `,
    ).run(sparkasseId);

    const detail = getMonthDetail("2031-03", "2031-04");

    expect(detail.monthKey).toBe("2031-03");
    expect(detail.detailHref).toBe("/monate/2031-03");
    expect(detail.previousMonth.href).toBe("/monate/2031-02");
    expect(detail.nextMonth?.href).toBe("/monate/2031-04");
    expect(detail.transactions).toHaveLength(4);
    expect(detail.transactions[0]?.bookingDate).toBe("2031-03-14");
    expect(detail.transactions.some((row) => row.sourceType === "import")).toBe(true);
    expect(detail.transactions.some((row) => row.specialBudgetName === "Test Special")).toBe(true);
  });

  it("builds one shared month snapshot for totals, budgets and transactions", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES ('2031-05', ?, 15000)
      `,
    ).run(einkaufId);

    const specialBudgetId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
            VALUES ('Mai Reise', '2031-05', 12000, 'Test', 1)
          `,
        )
        .run().lastInsertRowid,
    );

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2031-05-03', '2031-05', 250000, 'EUR', 'Gehalt', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-05-10', '2031-05', -4200, 'EUR', 'Supermarkt', 'manual', ?, NULL),
          (?, NULL, 'expense', '2031-05-15', '2031-05', -1800, 'EUR', 'Museumsbesuch', 'manual', NULL, ?)
      `,
    ).run(sparkasseId, sparkasseId, einkaufId, sparkasseId, specialBudgetId);

    const snapshot = getMonthSnapshot("2031-05");

    expect(snapshot.totals.monthKey).toBe("2031-05");
    expect(snapshot.totals.incomeCents).toBe(250000);
    expect(snapshot.categoryRows.find((row) => row.categoryName === "Einkauf")?.spentAmountCents).toBe(
      4200,
    );
    expect(snapshot.specialBudgetRows.find((row) => row.name === "Mai Reise")?.actualExpenseCents).toBe(
      1800,
    );
    expect(snapshot.transactions.map((transaction) => transaction.description)).toEqual([
      "Museumsbesuch",
      "Supermarkt",
      "Gehalt",
    ]);
  });

  it("uses the category default as month fallback until an explicit month override exists", () => {
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare(
      `
        UPDATE categories
        SET default_budget_amount_cents = 22000
        WHERE id = ?
      `,
    ).run(einkaufId);

    let snapshot = getMonthSnapshot("2031-06");
    let einkauf = snapshot.categoryRows.find((row) => row.categoryId === einkaufId);

    expect(einkauf?.defaultBudgetAmountCents).toBe(22000);
    expect(einkauf?.monthOverrideAmountCents).toBeNull();
    expect(einkauf?.budgetAmountCents).toBe(22000);

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES ('2031-06', ?, 17500)
      `,
    ).run(einkaufId);

    snapshot = getMonthSnapshot("2031-06");
    einkauf = snapshot.categoryRows.find((row) => row.categoryId === einkaufId);

    expect(einkauf?.defaultBudgetAmountCents).toBe(22000);
    expect(einkauf?.monthOverrideAmountCents).toBe(17500);
    expect(einkauf?.budgetAmountCents).toBe(17500);
  });
});
