import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type DashboardModule = typeof import("@/src/dashboard/repository");

let dbClient: DbClientModule;
let dashboard: DashboardModule;

const PREFIX = "TEST-FIN-013A-";
const TEST_MONTH = "2031-01";

function tableExists(tableName: string): boolean {
  const row = dbClient
    .getDb()
    .prepare(
      `
        SELECT 1 AS existsFlag
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
        LIMIT 1
      `,
    )
    .get(tableName) as { existsFlag: number } | undefined;

  return row?.existsFlag === 1;
}

function cleanup(): void {
  const db = dbClient.getDb();

  if (tableExists("fixed_cost_transaction_links")) {
    db.prepare(
      `
        DELETE FROM fixed_cost_transaction_links
        WHERE transaction_id IN (
          SELECT id FROM transactions WHERE description LIKE ?
        )
      `,
    ).run(`${PREFIX}%`);
  }

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
  it("aggregates month totals and excludes transfers from expenses", () => {
    cleanup();

    const db = dbClient.getDb();
    const sparkasseId = getAccountId("Sparkasse");
    const cashId = getAccountId("Bargeld");
    const einkaufId = getCategoryId("Einkauf");
    const freizeitId = getCategoryId("Freizeit");
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
        VALUES (?, ?, 50000), (?, ?, 10000)
      `,
    ).run(TEST_MONTH, einkaufId, TEST_MONTH, freizeitId);

    const specialBudget = db
      .prepare(
        `
          INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
          VALUES (?, ?, 20000, 'Test', 1)
        `,
      )
      .run(`${PREFIX}Bali`, TEST_MONTH);
    const specialBudgetId = Number(specialBudget.lastInsertRowid);

    const fixedCost = db
      .prepare(
        `
          INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
          VALUES (?, 3490, 1, 'SEPA', 'Test', 1)
        `,
      )
      .run(`${PREFIX}Fitness`);
    const fixedCostId = Number(fixedCost.lastInsertRowid);

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

    const fixedTx = db
      .prepare(
        `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
          ) VALUES (?, NULL, 'expense', '2031-01-09', -3490, 'EUR', ?, 'manual', ?, NULL)
        `,
      )
      .run(sparkasseId, `${PREFIX}FitnessCharge`, freizeitId);
    const fixedTxId = Number(fixedTx.lastInsertRowid);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-01-12', -5000, 'EUR', ?, 'manual', NULL, ?)
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

    db.exec(
      `
        CREATE TABLE IF NOT EXISTS fixed_cost_transaction_links (
          transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
          fixed_cost_id INTEGER NOT NULL REFERENCES fixed_costs(id) ON DELETE RESTRICT,
          effective_month_key TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `,
    );

    db.prepare(
      `
        INSERT INTO fixed_cost_transaction_links (transaction_id, fixed_cost_id, effective_month_key)
        VALUES (?, ?, ?)
      `,
    ).run(fixedTxId, fixedCostId, TEST_MONTH);

    const snapshot = dashboard.getDashboardMonthSnapshot(TEST_MONTH);

    expect(snapshot.totals.incomeCents).toBe(200000);
    expect(snapshot.totals.expenseCents).toBe(18490);
    expect(snapshot.totals.plannedFixedCostsCents).toBe(baselinePlannedFixedCostsCents + 3490);
    expect(snapshot.totals.actualFixedCostsCents).toBe(3490);
    expect(snapshot.totals.availableCents).toBe(
      200000 - 18490 - (baselinePlannedFixedCostsCents + 3490),
    );

    const einkauf = snapshot.categoryRows.find((row) => row.categoryName === "Einkauf");
    const freizeit = snapshot.categoryRows.find((row) => row.categoryName === "Freizeit");
    expect(einkauf?.spentAmountCents).toBe(10000);
    expect(einkauf?.remainingAmountCents).toBe(40000);
    expect(freizeit?.spentAmountCents).toBe(3490);

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
