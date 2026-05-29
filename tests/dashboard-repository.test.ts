import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { getDashboardMonthSnapshot } = await import("@/src/dashboard/repository");

const PREFIX = "TEST-FIN-027-";
const TEST_MONTH = "2031-01";

function getAccountId(name: "Sparkasse" | "Bargeld"): number {
  return (db.prepare("SELECT id FROM accounts WHERE name = ?").get(name) as { id: number }).id;
}

function getCategoryId(name: string): number {
  return (db.prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: number }).id;
}

describe("dashboard repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("calculates available from income - planned fixed costs - variable expenses", () => {
    const sparkasseId = getAccountId("Sparkasse");
    const cashId = getAccountId("Bargeld");
    const einkaufId = getCategoryId("Einkauf");
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
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES (?, ?, 50000)
      `,
    ).run(TEST_MONTH, einkaufId);

    const specialBudget = db
      .prepare(
        `
          INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
          VALUES (?, ?, 20000, 'Test', 1)
        `,
      )
      .run(`${PREFIX}Bali`, TEST_MONTH);
    const specialBudgetId = Number(specialBudget.lastInsertRowid);

    db.prepare(
      `
        INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
        VALUES (?, 3490, 1, 'FITNESS STUDIO', 'Test', 1)
      `,
    ).run(`${PREFIX}Fitness Studio`);
    const fixedCostPlanCents = 3490;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'income', '2031-01-05', '2031-01', 200000, 'EUR', ?, 'manual', NULL, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}Salary`);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-08', '2031-01', -10000, 'EUR', ?, 'manual', ?, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}Groceries`, einkaufId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-09', '2031-01', -5000, 'EUR', ?, 'manual', NULL, ?)
      `,
    ).run(sparkasseId, `${PREFIX}BaliExpense`, specialBudgetId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, ?, 'transfer', '2031-01-14', '2031-01', -5000, 'EUR', ?, 'manual', NULL, NULL)
      `,
    ).run(sparkasseId, cashId, `${PREFIX}CashTransfer`);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-16', '2031-01', -2500, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(
      sparkasseId,
      `${PREFIX}ImportVariableExpense`,
      `${PREFIX}OFFENER BUCHUNGSTEXT`,
    );

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-17', '2031-01', -4000, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}UEBERWEISUNG | N26-Fix. Monatsblock`, "N26 BANK");

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-18', '2031-01', -3490, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(
      sparkasseId,
      `${PREFIX}Lastschrift Fitness`,
      `${PREFIX}FITNESS STUDIO`,
    );

    const snapshot = getDashboardMonthSnapshot(TEST_MONTH);

    expect(snapshot.totals.incomeCents).toBe(200000);
    expect(snapshot.totals.expenseCents).toBe(17500);
    expect(snapshot.totals.plannedFixedCostsCents).toBe(
      baselinePlannedFixedCostsCents + fixedCostPlanCents,
    );
    expect(snapshot.totals.actualFixedCostsCents).toBe(7490);
    expect(snapshot.totals.availableCents).toBe(
      200000 - 17500 - (baselinePlannedFixedCostsCents + fixedCostPlanCents),
    );

    const einkauf = snapshot.categoryRows.find((row) => row.categoryName === "Einkauf");
    expect(einkauf?.spentAmountCents).toBe(10000);
    expect(einkauf?.remainingAmountCents).toBe(40000);

    const bali = snapshot.specialBudgetRows.find((row) => row.name === `${PREFIX}Bali`);
    expect(bali?.plannedAmountCents).toBe(20000);
    expect(bali?.actualExpenseCents).toBe(5000);
    expect(bali?.remainingAmountCents).toBe(15000);

    expect(snapshot.totals.cashBalanceCents).toBe(5000);
  });

  it("rejects invalid month format", () => {
    expect(() => getDashboardMonthSnapshot("2026-5")).toThrow(
      "Monat muss im Format YYYY-MM vorliegen.",
    );
  });
});
