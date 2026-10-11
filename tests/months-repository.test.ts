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
  closeMonth,
  getMonthDetail,
  getMonthSnapshot,
  getMonthStatus,
  listMonthComparison,
  listMonthTimeline,
  reopenMonth,
  clearFixedCostControlOverrideForMonth,
  setFixedCostControlOverrideForMonth,
} = await import("@/src/months/repository");
const { setSpecialBudgetProjectActive } = await import(
  "@/src/special-budgets/repository"
);
const { listActiveImportRules } = await import("@/src/import-rules/repository");

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

  it("shows future months with transactions without filling empty future gaps", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2031-01-05', '2031-01', 120000, 'EUR', 'Past Salary', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-07-10', '2031-07', -4200, 'EUR', 'Future Expense', 'manual', ?, NULL)
      `,
    ).run(sparkasseId, sparkasseId, einkaufId);

    const months = listMonthTimeline("2031-04");

    expect(months.map((month) => month.monthKey)).toEqual([
      "2031-07",
      "2031-04",
      "2031-03",
      "2031-02",
      "2031-01",
    ]);
    expect(months.some((month) => month.monthKey === "2031-06")).toBe(false);
    expect(months.find((month) => month.monthKey === "2031-07")?.variableExpenseCents).toBe(
      4200,
    );
  });

  it("uses budgets, special budgets, todos and month statuses as visible month activity", () => {
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES ('2031-06', ?, 24000)
      `,
    ).run(einkaufId);

    db.prepare(
      `
        INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
        VALUES ('Future Special', '2031-07', 9000, 'Test', 1)
      `,
    ).run();

    db.prepare(
      `
        INSERT INTO monthly_todos (month_key, text)
        VALUES ('2031-08', 'Future todo')
      `,
    ).run();

    db.prepare(
      `
        INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
        VALUES ('2031-09', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    ).run();

    const months = listMonthTimeline("2031-04");

    expect(months.map((month) => month.monthKey)).toEqual([
      "2031-09",
      "2031-08",
      "2031-07",
      "2031-06",
      "2031-04",
    ]);
    expect(months.some((month) => month.monthKey === "2031-05")).toBe(false);
    expect(months.find((month) => month.monthKey === "2031-06")?.currentBudgetCents).toBe(0);
    expect(
      months.find((month) => month.monthKey === "2031-06")
        ?.projectedAfterFixedCostsCents,
    ).toBeLessThanOrEqual(0);
  });

  it("builds simple month comparison values and excludes transfers and savings from expenses", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const savingsId = (
      db.prepare("SELECT id FROM categories WHERE system_key = 'savings'").get() as { id: number }
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
          (?, NULL, 'expense', '2032-01-11', '2032-01', -15000, 'EUR', 'Comparison Savings', 'manual', ?, NULL),
          (?, NULL, 'expense', '2032-01-12', '2032-01', -6000, 'EUR', 'Comparison Fixed Cost', 'import', NULL, NULL),
          (?, ?, 'transfer', '2032-01-12', '2032-01', -50000, 'EUR', 'Comparison Cash Transfer', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2032-03-03', '2032-03', -12000, 'EUR', 'Comparison March Expense', 'manual', ?, NULL)
      `,
    ).run(
      sparkasseId,
      sparkasseId,
      sparkasseId,
      einkaufId,
      sparkasseId,
      savingsId,
      sparkasseId,
      sparkasseId,
      bargeldId,
      sparkasseId,
      einkaufId,
    );

    const fixedCostTransaction = db
      .prepare(
        "SELECT id FROM transactions WHERE description = 'Comparison Fixed Cost'",
      )
      .get() as { id: number };
    db.prepare(
      `
        INSERT INTO transaction_fixed_cost_control_matches (
          transaction_id, import_rule_id, rule_name_snapshot,
          rule_pattern_snapshot, rule_match_field_snapshot
        ) VALUES (?, NULL, 'Comparison Fixed Cost Rule', 'Comparison Fixed', 'description')
      `,
    ).run(fixedCostTransaction.id);

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
      expenseCents: 14500,
      savingsCents: 15000,
      detailHref: "/monate/2032-01",
    });
    expect(january?.savingsCents).not.toBe((january?.incomeCents ?? 0) - (january?.expenseCents ?? 0));

    const february = comparison.find((month) => month.monthKey === "2032-02");
    expect(february).toMatchObject({
      incomeCents: 0,
      expenseCents: 0,
      savingsCents: 0,
    });

    const march = comparison.find((month) => month.monthKey === "2032-03");
    expect(march?.savingsCents).toBe(0);
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

    const specialBudgetProjectId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budget_projects (name, status, icon_name)
            VALUES ('Test Special', 'active', 'UR')
          `,
        )
        .run().lastInsertRowid,
    );

    const specialBudgetId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budgets (project_id, name, month_key, planned_amount_cents, note, is_active)
            VALUES (?, 'Test Special', '2031-03', 5000, 'Test', 1)
          `,
        )
        .run(specialBudgetProjectId).lastInsertRowid,
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
    expect(
      detail.transactions.find((row) => row.description === "Manual Special")
        ?.specialBudgetIconName,
    ).toBe("UR");
    expect(
      detail.dashboard.specialBudgetRows.find((row) => row.name === "Test Special")?.iconName,
    ).toBe("UR");
  });

  it("builds one shared month snapshot for totals, budgets and transactions", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const savingsId = (
      db.prepare("SELECT id FROM categories WHERE system_key = 'savings'").get() as { id: number }
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
          (?, NULL, 'expense', '2031-05-15', '2031-05', -1800, 'EUR', 'Museumsbesuch', 'manual', NULL, ?),
          (?, NULL, 'expense', '2031-05-18', '2031-05', -5000, 'EUR', 'Sparrate', 'manual', ?, NULL),
          (?, NULL, 'expense', '2031-05-19', '2031-05', -1250, 'EUR', 'Importierte Sparrate', 'import', ?, NULL),
          (?, NULL, 'expense', '2031-06-01', '2031-06', -9900, 'EUR', 'Sparrate Folgemonat', 'manual', ?, NULL)
      `,
    ).run(
      sparkasseId,
      sparkasseId,
      einkaufId,
      sparkasseId,
      specialBudgetId,
      sparkasseId,
      savingsId,
      sparkasseId,
      savingsId,
      sparkasseId,
      savingsId,
    );

    const snapshot = getMonthSnapshot("2031-05");

    expect(snapshot.totals.monthKey).toBe("2031-05");
    expect(snapshot.totals.incomeCents).toBe(250000);
    expect(snapshot.totals.expenseCents).toBe(6000);
    expect(snapshot.totals.savingsCents).toBe(6250);
    expect(snapshot.totals.currentBudgetCents).toBe(250000 - 6000 - 6250);
    expect(snapshot.totals.projectedAfterFixedCostsCents).toBe(
      250000 - 6000 - 6250 - snapshot.totals.plannedFixedCostsCents,
    );
    expect(snapshot.categoryRows.find((row) => row.categoryName === "Einkauf")?.spentAmountCents).toBe(
      4200,
    );
    expect(snapshot.categoryRows.find((row) => row.categoryName === "Sparen")?.spentAmountCents).toBe(
      6250,
    );
    expect(snapshot.specialBudgetRows.find((row) => row.name === "Mai Reise")?.actualExpenseCents).toBe(
      1800,
    );
    expect(snapshot.transactions.map((transaction) => transaction.description)).toEqual([
      "Importierte Sparrate",
      "Sparrate",
      "Museumsbesuch",
      "Supermarkt",
      "Gehalt",
    ]);
  });

  it("calculates the month budget stand without double-counting persisted fixed-cost controls", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const savingsId = (
      db.prepare("SELECT id FROM categories WHERE system_key = 'savings'").get() as { id: number }
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
          (?, NULL, 'expense', '2031-08-07', '2031-08', -1700, 'EUR', 'TEST-FIN-063 Nicht erkannte Fixkostenbuchung', 'UNKNOWN PROVIDER', 'import', NULL, NULL),
          (?, NULL, 'expense', '2031-08-08', '2031-08', -5300, 'EUR', 'TEST-FIN-130 Sparrate', NULL, 'manual', ?, NULL),
          (?, NULL, 'expense', '2031-09-01', '2031-09', -4000, 'EUR', 'TEST-FIN-063 N26-Fix. Folgemonat', 'N26 BANK', 'import', NULL, NULL)
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
      sparkasseId,
      savingsId,
      sparkasseId,
    );

    const n26Transaction = db
      .prepare(
        "SELECT id FROM transactions WHERE description = 'TEST-FIN-063 N26-Fix. Monatsblock'",
      )
      .get() as { id: number };
    const n26Rule = listActiveImportRules().find(
      (rule) => rule.rulePurpose === "fixed_cost_control",
    );
    expect(n26Rule).toBeDefined();
    db.prepare(
      `
        INSERT INTO transaction_fixed_cost_control_matches (
          transaction_id, import_rule_id, rule_name_snapshot,
          rule_pattern_snapshot, rule_match_field_snapshot
        ) VALUES (?, ?, ?, ?, ?)
      `,
    ).run(
      n26Transaction.id,
      n26Rule!.id,
      n26Rule!.name,
      n26Rule!.pattern,
      n26Rule!.matchField,
    );

    const plannedFixedCostsCents = baselinePlannedFixedCostsCents + 3490;
    const snapshot = getMonthSnapshot("2031-08");

    expect(snapshot.totals.incomeCents).toBe(200000);
    expect(snapshot.totals.actualFixedCostsCents).toBe(4000);
    expect(snapshot.fixedCostControlMatches).toHaveLength(1);
    expect(
      snapshot.fixedCostControlMatches.reduce(
        (sum, match) => sum + match.controlAmountCents,
        0,
      ),
    ).toBe(snapshot.totals.actualFixedCostsCents);
    expect(snapshot.fixedCostControlMatches.map((match) => match.bookingDate)).toEqual([
      "2031-08-05",
    ]);
    expect(snapshot.fixedCostControlMatches.map((match) => match.controlLabel)).toEqual([
      "Fixkosten-Kontrolle: Kontrollmuster",
    ]);
    expect(snapshot.fixedCostControlMatches.map((match) => match.displayName)).toEqual([
      "Test-fin-063 N26-Fix. Monatsblock",
    ]);
    expect(snapshot.transactions.map((transaction) => transaction.description)).toEqual([
      "TEST-FIN-130 Sparrate",
      "TEST-FIN-063 Nicht erkannte Fixkostenbuchung",
      "TEST-FIN-063 Lastschrift Fitness",
      "TEST-FIN-063 Cash Transfer",
      "TEST-FIN-063 Groceries",
      "TEST-FIN-063 Salary",
    ]);
    expect(snapshot.totals.expenseCents).toBe(15190);
    expect(snapshot.totals.savingsCents).toBe(5300);
    expect(snapshot.totals.plannedFixedCostsCents).toBe(plannedFixedCostsCents);
    expect(snapshot.totals.currentBudgetCents).toBe(
      200000 - 15190 - 5300 - 4000,
    );
    expect(snapshot.totals.projectedAfterFixedCostsCents).toBe(
      200000 - 15190 - 5300 - plannedFixedCostsCents,
    );
  });

  it("allows manual fixed-cost control overrides for month expenses", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    const manualExpense = db
      .prepare(
        `
          INSERT INTO transactions (
            account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
            amount_cents, currency_code, description, source_type, category_id, special_budget_id
          )
          VALUES (?, NULL, 'expense', '2031-12-05', '2031-12', -2890, 'EUR', 'TEST-FIN-100 Manual Gym', 'manual', ?, NULL)
        `,
      )
      .run(sparkasseId, einkaufId);
    const transactionId = Number(manualExpense.lastInsertRowid);
    const unmarkedSnapshot = getMonthSnapshot("2031-12");

    setFixedCostControlOverrideForMonth(transactionId, "2031-12", "include");

    const markedSnapshot = getMonthSnapshot("2031-12");

    expect(markedSnapshot.fixedCostControlMatches).toHaveLength(1);
    expect(markedSnapshot.fixedCostControlMatches[0]).toMatchObject({
      transactionId,
      controlAmountCents: 2890,
      controlLabel: "Fixkosten-Kontrolle: Manuell markiert",
      controlSource: "manual",
    });
    expect(markedSnapshot.transactions.map((transaction) => transaction.id)).not.toContain(
      transactionId,
    );
    expect(markedSnapshot.totals.actualFixedCostsCents).toBe(2890);
    expect(markedSnapshot.totals.expenseCents).toBe(0);
    expect(markedSnapshot.totals.currentBudgetCents).toBe(
      unmarkedSnapshot.totals.currentBudgetCents,
    );
    expect(
      markedSnapshot.categoryRows.find((row) => row.categoryId === einkaufId)
        ?.spentAmountCents,
    ).toBe(0);

    clearFixedCostControlOverrideForMonth(transactionId, "2031-12");

    const clearedSnapshot = getMonthSnapshot("2031-12");

    expect(clearedSnapshot.fixedCostControlMatches).toHaveLength(0);
    expect(clearedSnapshot.transactions.map((transaction) => transaction.id)).toContain(
      transactionId,
    );
    expect(clearedSnapshot.totals.actualFixedCostsCents).toBe(0);
    expect(clearedSnapshot.totals.expenseCents).toBe(2890);
    expect(clearedSnapshot.totals.currentBudgetCents).toBe(
      markedSnapshot.totals.currentBudgetCents,
    );
    expect(
      clearedSnapshot.categoryRows.find((row) => row.categoryId === einkaufId)
        ?.spentAmountCents,
    ).toBe(2890);
  });

  it("keeps the current budget stable while an include corrects the planned projection", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare("UPDATE fixed_costs SET is_active = 0").run();
    db.prepare(
      `
        INSERT INTO fixed_costs (
          name, planned_amount_cents, booking_day_of_month,
          payment_note, note, is_active
        ) VALUES
          (
            'TEST-FIN-127 Miete Plan', 60000, 1,
            'Test', 'Verbindliches Umklassifizierungsbeispiel', 1
          ),
          (
            'TEST-FIN-127 Sonstiger Fixkostenplan', 40000, 2,
            'Test', 'Verbindliches Umklassifizierungsbeispiel', 1
          )
      `,
    ).run();

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date,
          effective_month_key, amount_cents, currency_code, description,
          source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2033-01-01', '2033-01', 300000, 'EUR',
            'TEST-FIN-127 Einkommen', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2033-01-02', '2033-01', -50000, 'EUR',
            'TEST-FIN-127 Sonstige variable Ausgaben', 'manual', ?, NULL)
      `,
    ).run(sparkasseId, sparkasseId, einkaufId);

    const rentExpense = db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date,
          effective_month_key, amount_cents, currency_code, description,
          source_type, category_id, special_budget_id
        ) VALUES (
          ?, NULL, 'expense', '2033-01-03', '2033-01', -60000, 'EUR',
          'TEST-FIN-127 Miete', 'manual', ?, NULL
        )
      `,
    ).run(sparkasseId, einkaufId);
    const rentTransactionId = Number(rentExpense.lastInsertRowid);

    const beforeInclude = getMonthSnapshot("2033-01");

    expect(beforeInclude.totals).toMatchObject({
      incomeCents: 300000,
      expenseCents: 110000,
      actualFixedCostsCents: 0,
      plannedFixedCostsCents: 100000,
      currentBudgetCents: 190000,
      projectedAfterFixedCostsCents: 90000,
    });

    setFixedCostControlOverrideForMonth(
      rentTransactionId,
      "2033-01",
      "include",
    );

    const afterInclude = getMonthSnapshot("2033-01");

    expect(afterInclude.totals).toMatchObject({
      incomeCents: 300000,
      expenseCents: 50000,
      actualFixedCostsCents: 60000,
      plannedFixedCostsCents: 100000,
      currentBudgetCents: 190000,
      projectedAfterFixedCostsCents: 150000,
    });
    expect(afterInclude.totals.currentBudgetCents).toBe(
      beforeInclude.totals.currentBudgetCents,
    );
    expect(afterInclude.totals.projectedAfterFixedCostsCents).toBe(
      beforeInclude.totals.projectedAfterFixedCostsCents + 60000,
    );
  });

  it("excludes manual fixed-cost control overrides from special budget actuals", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const specialBudgetId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
            VALUES ('TEST-FIN-100 Spezial', '2031-11', 10000, 'Test', 1)
          `,
        )
        .run().lastInsertRowid,
    );

    const manualExpense = db
      .prepare(
        `
          INSERT INTO transactions (
            account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
            amount_cents, currency_code, description, source_type, category_id, special_budget_id
          )
          VALUES (?, NULL, 'expense', '2031-11-05', '2031-11', -3490, 'EUR', 'TEST-FIN-100 Spezial Gym', 'manual', NULL, ?)
        `,
      )
      .run(sparkasseId, specialBudgetId);
    const transactionId = Number(manualExpense.lastInsertRowid);

    expect(
      getMonthSnapshot("2031-11").specialBudgetRows.find(
        (row) => row.id === specialBudgetId,
      )?.actualExpenseCents,
    ).toBe(3490);

    setFixedCostControlOverrideForMonth(transactionId, "2031-11", "include");

    const markedSnapshot = getMonthSnapshot("2031-11");

    expect(markedSnapshot.totals.expenseCents).toBe(0);
    expect(
      markedSnapshot.specialBudgetRows.find((row) => row.id === specialBudgetId)
        ?.actualExpenseCents,
    ).toBe(0);
    expect(
      markedSnapshot.specialBudgetRows.find((row) => row.id === specialBudgetId)
        ?.remainingAmountCents,
    ).toBe(10000);
  });

  it("keeps current stable while exclude makes the planned double count visible", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
        VALUES ('TEST-FIN-100 Streaming', 1299, 1, 'STREAMING SERVICE', 'Test', 1)
      `,
    ).run();

    const recognizedExpense = db
      .prepare(
        `
          INSERT INTO transactions (
            account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
            amount_cents, currency_code, description, counterparty_name, source_type, category_id, special_budget_id
          )
          VALUES (?, NULL, 'expense', '2032-01-03', '2032-01', -1299, 'EUR', 'TEST-FIN-100 Streaming Lastschrift', 'STREAMING SERVICE', 'import', NULL, NULL)
        `,
      )
      .run(sparkasseId);
    const transactionId = Number(recognizedExpense.lastInsertRowid);
    const rule = listActiveImportRules().find(
      (candidate) => candidate.rulePurpose === "fixed_cost_control",
    );
    expect(rule).toBeDefined();
    db.prepare(
      `
        INSERT INTO transaction_fixed_cost_control_matches (
          transaction_id, import_rule_id, rule_name_snapshot,
          rule_pattern_snapshot, rule_match_field_snapshot
        ) VALUES (?, ?, ?, ?, ?)
      `,
    ).run(transactionId, rule!.id, rule!.name, rule!.pattern, rule!.matchField);

    const automaticallyControlledSnapshot = getMonthSnapshot("2032-01");
    expect(automaticallyControlledSnapshot.fixedCostControlMatches).toHaveLength(1);

    setFixedCostControlOverrideForMonth(transactionId, "2032-01", "exclude");

    const snapshot = getMonthSnapshot("2032-01");

    expect(snapshot.fixedCostControlMatches).toHaveLength(0);
    expect(snapshot.transactions.map((transaction) => transaction.id)).toContain(
      transactionId,
    );
    expect(snapshot.totals.actualFixedCostsCents).toBe(0);
    expect(snapshot.totals.expenseCents).toBe(1299);
    expect(snapshot.totals.currentBudgetCents).toBe(
      automaticallyControlledSnapshot.totals.currentBudgetCents,
    );
    expect(snapshot.totals.projectedAfterFixedCostsCents).toBe(
      automaticallyControlledSnapshot.totals.projectedAfterFixedCostsCents -
        1299,
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
    expect(snapshot.totals.currentBudgetCents).toBe(10000 - 25000);
    expect(snapshot.totals.projectedAfterFixedCostsCents).toBe(
      10000 - 25000 - plannedFixedCostsCents,
    );
    expect(snapshot.totals.currentBudgetCents).toBeLessThan(0);
  });

  it("keeps cash balance separate from the month budget stand across months", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const freizeitId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Freizeit'").get() as { id: number }
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
          (?, ?, 'transfer', '2031-10-30', '2031-10', -5000, 'EUR', 'TEST-FIN-078 Cash Withdrawal', 'manual', NULL, NULL),
          (?, NULL, 'income', '2031-11-01', '2031-11', ?, 'EUR', 'TEST-FIN-078 Balancing Income', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-11-02', '2031-11', -2000, 'EUR', 'TEST-FIN-078 Cash Dinner', 'manual', ?, NULL)
      `,
    ).run(
      sparkasseId,
      bargeldId,
      sparkasseId,
      plannedFixedCostsCents + 2000,
      bargeldId,
      freizeitId,
    );

    const snapshot = getMonthSnapshot("2031-11");

    expect(snapshot.totals.incomeCents).toBe(plannedFixedCostsCents + 2000);
    expect(snapshot.totals.expenseCents).toBe(2000);
    expect(snapshot.totals.currentBudgetCents).toBe(plannedFixedCostsCents);
    expect(snapshot.totals.projectedAfterFixedCostsCents).toBe(0);
    expect(snapshot.totals.cashBalanceCents).toBe(3000);
    expect(snapshot.transactions.map((transaction) => transaction.description)).toEqual([
      "TEST-FIN-078 Cash Dinner",
      "TEST-FIN-078 Balancing Income",
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
    expect(snapshot.planSummary.plannedCategoryBudgetCents).toBeGreaterThanOrEqual(17500);
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
    expect(snapshot.planSummary.plannedSpecialBudgetCents).toBe(12000);

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
    expect(snapshot.planSummary.plannedSpecialBudgetCents).toBe(0);
  });

  it("keeps a closed month's special budget history stable when its project is archived", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const projectId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budget_projects (name, status, icon_name)
            VALUES ('TEST-FIN-123 Sommerreise', 'active', 'SR')
          `,
        )
        .run().lastInsertRowid,
    );
    const specialBudgetId = Number(
      db
        .prepare(
          `
            INSERT INTO special_budgets (
              project_id, name, month_key, planned_amount_cents, note, is_active
            )
            VALUES (?, 'TEST-FIN-123 Sommerreise', '2099-07', 50000, 'Historie', 1)
          `,
        )
        .run(projectId).lastInsertRowid,
    );

    const transactionId = Number(
      db
        .prepare(
          `
            INSERT INTO transactions (
              account_id, destination_account_id, transaction_type, booking_date,
              effective_month_key, amount_cents, currency_code, description,
              source_type, category_id, special_budget_id
            )
            VALUES (?, NULL, 'expense', '2099-07-15', '2099-07', -12500, 'EUR',
                    'TEST-FIN-123 Flug', 'manual', NULL, ?)
          `,
        )
        .run(sparkasseId, specialBudgetId).lastInsertRowid,
    );

    db.prepare(
      `
        INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
        VALUES ('2099-07', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    ).run();

    const shareBeforeArchive = db
      .prepare(
        `
          SELECT id, project_id AS projectId, month_key AS monthKey,
                 planned_amount_cents AS plannedAmountCents, note,
                 is_active AS isActive, updated_at AS updatedAt
          FROM special_budgets
          WHERE id = ?
        `,
      )
      .get(specialBudgetId);
    const snapshotBeforeArchive = getMonthSnapshot("2099-07");

    setSpecialBudgetProjectActive(projectId, false);

    const snapshotAfterArchive = getMonthSnapshot("2099-07");
    const shareAfterArchive = db
      .prepare(
        `
          SELECT id, project_id AS projectId, month_key AS monthKey,
                 planned_amount_cents AS plannedAmountCents, note,
                 is_active AS isActive, updated_at AS updatedAt
          FROM special_budgets
          WHERE id = ?
        `,
      )
      .get(specialBudgetId);
    const transactionAfterArchive = db
      .prepare("SELECT special_budget_id AS specialBudgetId FROM transactions WHERE id = ?")
      .get(transactionId) as { specialBudgetId: number };
    const projectAfterArchive = db
      .prepare("SELECT status FROM special_budget_projects WHERE id = ?")
      .get(projectId) as { status: string };

    expect(projectAfterArchive.status).toBe("archived");
    expect(shareAfterArchive).toEqual(shareBeforeArchive);
    expect(transactionAfterArchive.specialBudgetId).toBe(specialBudgetId);
    expect(snapshotAfterArchive.totals).toEqual(snapshotBeforeArchive.totals);
    expect(snapshotAfterArchive.planSummary).toEqual(snapshotBeforeArchive.planSummary);
    expect(
      snapshotAfterArchive.specialBudgetRows.find((row) => row.id === specialBudgetId),
    ).toEqual(
      snapshotBeforeArchive.specialBudgetRows.find((row) => row.id === specialBudgetId),
    );
    expect(
      snapshotAfterArchive.specialBudgetRows.find((row) => row.id === specialBudgetId)
        ?.isActive,
    ).toBe(true);
  });

  it("keeps open months on the live active fixed-cost plan until close", () => {
    db.prepare(
      `
        INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
        VALUES ('TEST-FIN-070 Live Rent', 120000, 1, 'Rent', 'Initial live value', 1)
      `,
    ).run();

    expect(getMonthStatus("2032-04")).toMatchObject({
      status: "open",
      hasFixedCostSnapshot: false,
    });
    expect(getMonthSnapshot("2032-04").totals.plannedFixedCostsCents).toBe(120000);

    db.prepare(
      `
        UPDATE fixed_costs
        SET planned_amount_cents = 135000
        WHERE name = 'TEST-FIN-070 Live Rent'
      `,
    ).run();

    expect(getMonthSnapshot("2032-04").totals.plannedFixedCostsCents).toBe(135000);
  });

  it("freezes the fixed-cost plan when a month is closed and ignores later amount changes", () => {
    db.prepare(
      `
        INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
        VALUES ('TEST-FIN-070 Frozen Rent', 90000, 1, 'Rent', 'Snapshot value', 1)
      `,
    ).run();

    const closedStatus = closeMonth("2032-05");

    expect(closedStatus).toMatchObject({
      monthKey: "2032-05",
      status: "closed",
      hasFixedCostSnapshot: true,
    });
    expect(getMonthSnapshot("2032-05").totals.plannedFixedCostsCents).toBe(90000);
    expect(
      getMonthSnapshot("2032-05").totals.projectedAfterFixedCostsCents,
    ).toBe(-90000);

    db.prepare(
      `
        UPDATE fixed_costs
        SET planned_amount_cents = 99000
        WHERE name = 'TEST-FIN-070 Frozen Rent'
      `,
    ).run();

    const frozenMonth = getMonthSnapshot("2032-05");
    const liveMonth = getMonthSnapshot("2032-06");
    expect(frozenMonth.totals.plannedFixedCostsCents).toBe(90000);
    expect(frozenMonth.totals.projectedAfterFixedCostsCents).toBe(-90000);
    expect(liveMonth.totals.plannedFixedCostsCents).toBe(99000);
    expect(liveMonth.totals.projectedAfterFixedCostsCents).toBe(-99000);
  });

  it("freezes effective category budget values when a month is closed", () => {
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;

    db.prepare(
      `
        UPDATE categories
        SET default_budget_amount_cents = 25000
        WHERE id = ?
      `,
    ).run(einkaufId);

    closeMonth("2032-06");

    db.prepare(
      `
        UPDATE categories
        SET default_budget_amount_cents = 31000
        WHERE id = ?
      `,
    ).run(einkaufId);

    const closedRow = getMonthSnapshot("2032-06").categoryRows.find(
      (row) => row.categoryId === einkaufId,
    );
    const openRow = getMonthSnapshot("2032-07").categoryRows.find(
      (row) => row.categoryId === einkaufId,
    );

    expect(closedRow?.budgetAmountCents).toBe(25000);
    expect(closedRow?.monthOverrideAmountCents).toBe(25000);
    expect(openRow?.budgetAmountCents).toBe(31000);
  });

  it("keeps the fixed-cost snapshot when a fixed cost is deactivated after close", () => {
    const fixedCostId = Number(
      db.prepare(
        `
          INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
          VALUES ('TEST-FIN-070 Archived Insurance', 4500, 15, 'Insurance', 'Snapshot value', 1)
        `,
      ).run().lastInsertRowid,
    );

    closeMonth("2032-07");
    db.prepare("UPDATE fixed_costs SET is_active = 0 WHERE id = ?").run(fixedCostId);

    expect(getMonthSnapshot("2032-07").totals.plannedFixedCostsCents).toBe(4500);
    expect(getMonthSnapshot("2032-08").totals.plannedFixedCostsCents).toBe(0);
  });

  it("reopens a month without losing or recalculating the fixed-cost snapshot", () => {
    db.prepare(
      `
        INSERT INTO fixed_costs (name, planned_amount_cents, booking_day_of_month, payment_note, note, is_active)
        VALUES ('TEST-FIN-070 Reopen Internet', 3999, 5, 'Internet', 'Snapshot value', 1)
      `,
    ).run();

    closeMonth("2032-09");

    db.prepare(
      `
        UPDATE fixed_costs
        SET planned_amount_cents = 4999
        WHERE name = 'TEST-FIN-070 Reopen Internet'
      `,
    ).run();

    const reopenedStatus = reopenMonth("2032-09");

    expect(reopenedStatus).toMatchObject({
      status: "open",
      hasFixedCostSnapshot: true,
    });
    expect(getMonthSnapshot("2032-09").totals.plannedFixedCostsCents).toBe(3999);

    closeMonth("2032-09");
    expect(getMonthSnapshot("2032-09").totals.plannedFixedCostsCents).toBe(3999);
  });
});
