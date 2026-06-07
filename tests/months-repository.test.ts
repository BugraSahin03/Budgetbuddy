import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const {
  buildMonthRange,
  getMonthDetail,
  getMonthSnapshot,
  listMonthComparison,
  listMonthTimeline,
} = await import("@/src/months/repository");

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

  it("builds simple month comparison values and excludes transfers from expenses", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES ('2031-12', ?, 25000)
      `,
    ).run(einkaufId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2032-01-05', '2032-01', 300000, 'EUR', 'Comparison Salary', 'manual', NULL, NULL),
          (?, NULL, 'refund', '2032-01-06', '2032-01', 2000, 'EUR', 'Comparison Refund', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2032-01-10', '2032-01', -8500, 'EUR', 'Comparison Grocery', 'manual', ?, NULL),
          (?, ?, 'transfer', '2032-01-12', '2032-01', -50000, 'EUR', 'Comparison Cash Transfer', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2032-03-03', '2032-03', -12000, 'EUR', 'Comparison March Expense', 'manual', ?, NULL)
      `,
    ).run(
      sparkasseId,
      sparkasseId,
      sparkasseId,
      einkaufId,
      sparkasseId,
      bargeldId,
      sparkasseId,
      einkaufId,
    );

    const comparison = listMonthComparison("2032-03");

    expect(comparison.map((month) => month.monthKey)).toEqual([
      "2032-03",
      "2032-02",
      "2032-01",
    ]);
    expect(comparison.some((month) => month.monthKey === "2031-12")).toBe(false);

    const january = comparison.find((month) => month.monthKey === "2032-01");
    expect(january).toMatchObject({
      incomeCents: 302000,
      expenseCents: 8500,
      savedCents: 293500,
      detailHref: "/monate/2032-01",
    });

    const february = comparison.find((month) => month.monthKey === "2032-02");
    expect(february).toMatchObject({
      incomeCents: 0,
      expenseCents: 0,
      savedCents: 0,
    });

    const march = comparison.find((month) => month.monthKey === "2032-03");
    expect(march?.savedCents).toBe(-12000);
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
    expect(detail.transactions.find((row) => row.description === "Manual Category")?.categoryId).toBe(
      einkaufId,
    );
    expect(
      detail.transactions.find((row) => row.description === "Manual Special")?.specialBudgetId,
    ).toBe(specialBudgetId);
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

  it("calculates the month budget stand without double-counting recognized fixed-cost controls", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const baselinePlannedFixedCostsCents = (
      db
        .prepare(
          `
            SELECT COALESCE(SUM(planned_amount_cents), 0) AS total
            FROM fixed_costs
            WHERE is_active = 1
          `,
        )
        .get() as { total: number }
    ).total;

    db.prepare(
      `
        INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
        VALUES ('TEST-FIN-063 Fitness Studio', 3490, 1, 'FITNESS STUDIO', 'Test', 1)
      `,
    ).run();

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2031-08-01', '2031-08', 200000, 'EUR', 'TEST-FIN-063 Salary', NULL, 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-08-03', '2031-08', -10000, 'EUR', 'TEST-FIN-063 Groceries', NULL, 'manual', ?, NULL),
          (?, ?, 'transfer', '2031-08-04', '2031-08', -50000, 'EUR', 'TEST-FIN-063 Cash Transfer', NULL, 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-08-05', '2031-08', -4000, 'EUR', 'TEST-FIN-063 N26-Fix. Monatsblock', 'N26 BANK', 'import', NULL, NULL),
          (?, NULL, 'expense', '2031-08-06', '2031-08', -3490, 'EUR', 'TEST-FIN-063 Lastschrift Fitness', 'FITNESS STUDIO', 'import', NULL, NULL),
          (?, NULL, 'expense', '2031-08-07', '2031-08', -1700, 'EUR', 'TEST-FIN-063 Nicht erkannte Fixkostenbuchung', 'UNKNOWN PROVIDER', 'import', NULL, NULL)
      `,
    ).run(
      sparkasseId,
      sparkasseId,
      einkaufId,
      sparkasseId,
      bargeldId,
      sparkasseId,
      sparkasseId,
      sparkasseId,
    );

    const plannedFixedCostsCents = baselinePlannedFixedCostsCents + 3490;
    const snapshot = getMonthSnapshot("2031-08");

    expect(snapshot.totals.incomeCents).toBe(200000);
    expect(snapshot.totals.actualFixedCostsCents).toBe(7490);
    expect(snapshot.totals.expenseCents).toBe(11700);
    expect(snapshot.totals.plannedFixedCostsCents).toBe(plannedFixedCostsCents);
    expect(snapshot.totals.availableCents).toBe(
      200000 - 11700 - plannedFixedCostsCents,
    );
  });

  it("keeps the month budget stand negative when expenses and fixed costs exceed income", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const plannedFixedCostsCents = (
      db
        .prepare(
          `
            SELECT COALESCE(SUM(planned_amount_cents), 0) AS total
            FROM fixed_costs
            WHERE is_active = 1
          `,
        )
        .get() as { total: number }
    ).total;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2031-09-01', '2031-09', 10000, 'EUR', 'TEST-FIN-063 Small Income', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-09-03', '2031-09', -25000, 'EUR', 'TEST-FIN-063 Large Expense', 'manual', ?, NULL),
          (?, ?, 'transfer', '2031-09-04', '2031-09', -50000, 'EUR', 'TEST-FIN-063 Ignored Transfer', 'manual', NULL, NULL)
      `,
    ).run(sparkasseId, sparkasseId, einkaufId, sparkasseId, bargeldId);

    const snapshot = getMonthSnapshot("2031-09");

    expect(snapshot.totals.incomeCents).toBe(10000);
    expect(snapshot.totals.expenseCents).toBe(25000);
    expect(snapshot.totals.availableCents).toBe(
      10000 - 25000 - plannedFixedCostsCents,
    );
    expect(snapshot.totals.availableCents).toBeLessThan(0);
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

  it("reflects special budget amount and active-state changes inside the month snapshot", () => {
    const specialBudgetId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
            VALUES ('TEST-FIN-039 Reise', '2031-07', 12000, 'Test', 1)
          `,
        )
        .run().lastInsertRowid,
    );

    let snapshot = getMonthSnapshot("2031-07");
    let specialBudget = snapshot.specialBudgetRows.find((row) => row.id === specialBudgetId);

    expect(specialBudget?.plannedAmountCents).toBe(12000);
    expect(specialBudget?.isActive).toBe(true);

    db.prepare(
      `
        UPDATE special_budgets
        SET planned_amount_cents = 18500,
            is_active = 0
        WHERE id = ?
      `,
    ).run(specialBudgetId);

    snapshot = getMonthSnapshot("2031-07");
    specialBudget = snapshot.specialBudgetRows.find((row) => row.id === specialBudgetId);

    expect(specialBudget?.plannedAmountCents).toBe(18500);
    expect(specialBudget?.remainingAmountCents).toBe(18500);
    expect(specialBudget?.isActive).toBe(false);
  });
});
