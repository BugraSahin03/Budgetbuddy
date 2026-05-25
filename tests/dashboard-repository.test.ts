import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type DashboardModule = typeof import("@/src/dashboard/repository");

let dbClient: DbClientModule;
let dashboard: DashboardModule;

const PREFIX = "TEST-FIN-027-";
const TEST_MONTH = "2031-01";

function cleanup(): void {
  const db = dbClient.getDb();

  db.prepare("DELETE FROM transactions WHERE description LIKE ?").run(`${PREFIX}%`);
  db.prepare("DELETE FROM special_budgets WHERE name LIKE ?").run(`${PREFIX}%`);
  db.prepare("DELETE FROM fixed_costs WHERE name LIKE ?").run(`${PREFIX}%`);
  db.prepare("DELETE FROM monthly_category_budgets WHERE month_key = ?").run(TEST_MONTH);
}

function getAccountId(name: "Sparkasse" | "Bargeld"): number {
  return (dbClient.getDb().prepare("SELECT id FROM accounts WHERE name = ?").get(name) as { id: number })
    .id;
}

function getCategoryId(name: string): number {
  return (dbClient.getDb().prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: number })
    .id;
}

beforeAll(async () => {
  dbClient = await import("@/src/db/client");
  dashboard = await import("@/src/dashboard/repository");
});

describe("dashboard repository", () => {
  it("calculates available from income - planned fixed costs - variable expenses", () => {
    cleanup();

    const db = dbClient.getDb();
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
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'income', '2031-01-05', 200000, 'EUR', ?, 'manual', NULL, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}Salary`);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-08', -10000, 'EUR', ?, 'manual', ?, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}Groceries`, einkaufId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-09', -5000, 'EUR', ?, 'manual', NULL, ?)
      `,
    ).run(sparkasseId, `${PREFIX}BaliExpense`, specialBudgetId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, ?, 'transfer', '2031-01-14', -5000, 'EUR', ?, 'manual', NULL, NULL)
      `,
    ).run(sparkasseId, cashId, `${PREFIX}CashTransfer`);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-16', -2500, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(
      sparkasseId,
      `${PREFIX}ImportVariableExpense`,
      `${PREFIX}OFFENER BUCHUNGSTEXT`,
    );

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-17', -4000, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}UEBERWEISUNG | N26-Fix. Monatsblock`, "N26 BANK");

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, counterparty_name, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-18', -3490, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(
      sparkasseId,
      `${PREFIX}Lastschrift Fitness`,
      `${PREFIX}FITNESS STUDIO`,
    );

    const snapshot = dashboard.getDashboardMonthSnapshot(TEST_MONTH);

    expect(snapshot.totals.incomeCents).toBe(200000);
    // Variable expenses include manual + imported expenses, but exclude fixed-cost control hits.
    expect(snapshot.totals.expenseCents).toBe(17500);
    expect(snapshot.totals.plannedFixedCostsCents).toBe(
      baselinePlannedFixedCostsCents + fixedCostPlanCents,
    );
    // Ist-Kontrolle: N26-Sammeltransfer (4000) + direkte Fixkostenabbuchung (3490).
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

    expect(snapshot.totals.cashBalanceCents).toBeGreaterThanOrEqual(5000);
  });

  it("rejects invalid month format", () => {
    expect(() => dashboard.getDashboardMonthSnapshot("2026-5")).toThrow(
      "Monat muss im Format YYYY-MM vorliegen.",
    );
  });
});
