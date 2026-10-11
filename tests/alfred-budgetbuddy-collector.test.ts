import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

// The production collector is plain ESM so it can run without a build step.
// @ts-expect-error The deployment module intentionally has no TypeScript declarations.
import {
  SNAPSHOT_CONTRACT_VERSION,
  buildSnapshot,
  collectSnapshot,
  openReadOnlyDatabase,
} from "../alfred/stage2/collector/collector.mjs";

const temporaryDirectories: string[] = [];

function createFixture(schemaVersion = "0020_fin_126") {
  const directory = mkdtempSync(path.join(tmpdir(), "alfred-budgetbuddy-"));
  temporaryDirectories.push(directory);
  const databasePath = path.join(directory, "budgetbuddy.db");
  const outputDirectory = path.join(directory, "snapshots");
  const db = new Database(databasePath);

  db.exec(`
    CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      opening_balance_cents INTEGER NOT NULL,
      is_active INTEGER NOT NULL
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      system_key TEXT,
      default_budget_amount_cents INTEGER
    );
    CREATE TABLE fixed_costs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      planned_amount_cents INTEGER NOT NULL,
      booking_day_of_month INTEGER,
      payment_note TEXT,
      is_active INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE monthly_category_budgets (
      month_key TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      budget_amount_cents INTEGER NOT NULL
    );
    CREATE TABLE monthly_statuses (
      month_key TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      fixed_cost_snapshot_created_at TEXT
    );
    CREATE TABLE monthly_fixed_cost_snapshots (
      id INTEGER PRIMARY KEY,
      month_key TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      planned_amount_cents_snapshot INTEGER NOT NULL,
      booking_day_of_month_snapshot INTEGER,
      is_included INTEGER NOT NULL
    );
    CREATE TABLE import_rules (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      match_field TEXT NOT NULL,
      target_type TEXT NOT NULL,
      rule_purpose TEXT NOT NULL,
      is_active INTEGER NOT NULL,
      priority INTEGER NOT NULL
    );
    CREATE TABLE transaction_fixed_cost_control_overrides (
      transaction_id INTEGER PRIMARY KEY,
      mode TEXT NOT NULL
    );
    CREATE TABLE transaction_fixed_cost_control_matches (
      transaction_id INTEGER PRIMARY KEY,
      import_rule_id INTEGER,
      rule_name_snapshot TEXT NOT NULL,
      rule_pattern_snapshot TEXT NOT NULL,
      rule_match_field_snapshot TEXT NOT NULL
    );
    CREATE TABLE special_budget_projects (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL
    );
    CREATE TABLE special_budgets (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      month_key TEXT NOT NULL,
      planned_amount_cents INTEGER NOT NULL,
      is_active INTEGER NOT NULL,
      project_id INTEGER
    );
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL,
      destination_account_id INTEGER,
      transaction_type TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      effective_month_key TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency_code TEXT NOT NULL,
      description TEXT NOT NULL,
      counterparty_name TEXT,
      counterparty_iban TEXT,
      import_fingerprint TEXT,
      source_type TEXT NOT NULL DEFAULT 'import',
      category_id INTEGER,
      special_budget_id INTEGER
    );
  `);

  db.prepare("INSERT INTO app_meta (key, value) VALUES ('schema_version', ?)").run(
    schemaVersion,
  );
  db.exec(`
    INSERT INTO accounts VALUES (1, 'Bank', 'bank', 'EUR', 100000, 1);
    INSERT INTO accounts VALUES (2, 'Cash', 'cash', 'EUR', 5000, 1);
    INSERT INTO categories VALUES (1, 'Groceries', NULL, 60000);
    INSERT INTO categories VALUES (2, 'Saving', 'savings', NULL);
    INSERT INTO fixed_costs VALUES (1, 'Rent', 80000, 1, 'LANDLORD RENT', 1, 1000);
    INSERT INTO fixed_costs VALUES (2, 'Subscription', 10000, NULL, NULL, 1, 2000);
    INSERT INTO monthly_category_budgets VALUES ('2026-07', 1, 70000);
    INSERT INTO monthly_statuses VALUES ('2026-06', 'closed', '2026-07-01T00:00:00Z');
    INSERT INTO monthly_fixed_cost_snapshots VALUES (1, '2026-06', 'Historical rent', 85000, 1, 1);
    INSERT INTO import_rules VALUES (
      1,
      'N26 fixed-cost control',
      'N26-Fix.',
      'description',
      'transfer_cash',
      'fixed_cost_control',
      1,
      60
    );
    INSERT INTO special_budget_projects VALUES (1, 'active');
    INSERT INTO special_budgets VALUES (1, 'Trip', '2026-07', 30000, 1, 1);

    INSERT INTO transactions (
      id,
      account_id,
      destination_account_id,
      transaction_type,
      booking_date,
      effective_month_key,
      amount_cents,
      currency_code,
      description,
      counterparty_name,
      counterparty_iban,
      import_fingerprint,
      category_id,
      special_budget_id
    ) VALUES
      (1, 1, NULL, 'income', '2026-07-01', '2026-07', 300000, 'EUR', 'salary secret', 'Employer', 'DE123', 'a', NULL, NULL),
      (2, 1, NULL, 'income_deduction', '2026-07-02', '2026-07', -20000, 'EUR', 'deduction secret', NULL, NULL, 'b', NULL, NULL),
      (3, 1, NULL, 'expense', '2026-07-03', '2026-07', -50000, 'EUR', 'merchant secret', 'Merchant', 'DE456', 'c', 1, NULL),
      (4, 1, NULL, 'expense', '2026-07-04', '2026-07', -40000, 'EUR', 'saving secret', NULL, NULL, 'd', 2, NULL),
      (5, 1, NULL, 'refund', '2026-07-05', '2026-07', 5000, 'EUR', 'refund secret', NULL, NULL, 'e', NULL, NULL),
      (6, 1, 2, 'transfer', '2026-07-06', '2026-07', -10000, 'EUR', 'cash transfer', NULL, NULL, 'f', NULL, NULL),
      (7, 1, NULL, 'expense', '2026-07-07', '2026-07', -1000, 'EUR', 'unassigned secret', 'Unknown', 'DE789', 'g', NULL, NULL),
      (8, 1, NULL, 'expense', '2026-07-08', '2026-07', -12000, 'EUR', 'trip secret', NULL, NULL, 'h', NULL, 1),
      (9, 1, NULL, 'income', '2026-06-01', '2026-06', 250000, 'EUR', 'older income', NULL, NULL, 'i', NULL, NULL),
      (10, 1, NULL, 'expense', '2026-07-01', '2026-07', -80000, 'EUR', 'direct fixed cost', 'LANDLORD RENT', NULL, 'j', NULL, NULL),
      (11, 1, NULL, 'expense', '2026-07-01', '2026-07', -10000, 'EUR', 'N26-Fix. monthly block', NULL, NULL, 'k', NULL, NULL);

    INSERT INTO transaction_fixed_cost_control_matches VALUES (
      11,
      1,
      'N26 fixed-cost control',
      'N26-Fix.',
      'description'
    );
  `);

  if (schemaVersion === "0021_fin_131") {
    db.exec(`
      CREATE TABLE transaction_settlement_groups (
        id INTEGER PRIMARY KEY,
        month_key TEXT NOT NULL,
        name TEXT NOT NULL,
        category_id INTEGER,
        special_budget_id INTEGER,
        is_finalized INTEGER NOT NULL
      );
      CREATE TABLE transaction_settlement_members (
        settlement_group_id INTEGER NOT NULL,
        transaction_id INTEGER NOT NULL UNIQUE
      );
      CREATE VIEW budget_effective_entries AS
      SELECT
        'transaction' AS entry_kind,
        t.id AS entry_id,
        t.effective_month_key AS month_key,
        t.transaction_type,
        t.amount_cents,
        t.category_id,
        t.special_budget_id
      FROM transactions t
      LEFT JOIN transaction_settlement_members member
        ON member.transaction_id = t.id
      WHERE member.transaction_id IS NULL
      UNION ALL
      SELECT
        'settlement',
        g.id,
        g.month_key,
        CASE WHEN SUM(t.amount_cents) < 0 THEN 'expense'
             WHEN SUM(t.amount_cents) > 0 THEN 'refund'
             ELSE 'settlement_zero' END,
        SUM(t.amount_cents),
        CASE WHEN SUM(t.amount_cents) < 0 THEN g.category_id ELSE NULL END,
        CASE WHEN SUM(t.amount_cents) < 0 THEN g.special_budget_id ELSE NULL END
      FROM transaction_settlement_groups g
      INNER JOIN transaction_settlement_members member
        ON member.settlement_group_id = g.id
      INNER JOIN transactions t ON t.id = member.transaction_id
      WHERE g.is_finalized = 1
      GROUP BY g.id, g.month_key, g.category_id, g.special_budget_id;

      INSERT INTO transaction_settlement_groups VALUES (
        1, '2026-07', 'Merchant refund settlement', 1, NULL, 1
      );
      INSERT INTO transaction_settlement_members VALUES (1, 3), (1, 5);
    `);
  }

  db.close();
  return { databasePath, outputDirectory };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Alfred BudgetBuddy collector", () => {
  it("opens SQLite read-only with query_only enforced", () => {
    const { databasePath } = createFixture();
    const db = openReadOnlyDatabase(databasePath);

    expect(db.pragma("query_only", { simple: true })).toBe(1);
    expect(() =>
      db.prepare("INSERT INTO app_meta (key, value) VALUES ('forbidden', '1')").run(),
    ).toThrow();
    db.close();
  });

  it("builds privacy-minimized monthly and weekly aggregates", () => {
    const { databasePath } = createFixture();
    const db = openReadOnlyDatabase(databasePath);
    const snapshot = buildSnapshot(db, {
      now: new Date("2026-07-15T12:00:00.000Z"),
      monthCount: 13,
      weekCount: 2,
    });
    db.close();

    expect(snapshot.contractVersion).toBe(SNAPSHOT_CONTRACT_VERSION);
    expect(snapshot.source.accessMode).toBe("sqlite-readonly-query-only");
    expect(snapshot.period.fromMonth).toBe("2026-06");
    expect(snapshot.months).toHaveLength(2);

    const july = snapshot.months.find((month: { monthKey: string }) =>
      month.monthKey === "2026-07"
    );
    expect(july).toMatchObject({
      grossIncomeCents: 300000,
      incomeDeductionCents: 20000,
      netIncomeCents: 280000,
      refundCents: 5000,
      totalExpenseCents: 193000,
      fixedCostControlCents: 10000,
      expenseCents: 183000,
      savingsCents: 40000,
      consumerExpenseCents: 143000,
      netCashflowCents: 92000,
      unassignedExpenseCount: 2,
      unassignedExpenseCents: 81000,
      plannedFixedCostsCents: 90000,
      plannedCategoryBudgetsCents: 70000,
      plannedSpecialBudgetsCents: 30000,
    });
    expect(july.fixedCosts).toMatchObject({
      planSource: "active_fixed_costs",
      plannedCents: 90000,
      plannedItemCount: 2,
      actualControlCents: 10000,
      actualControlCount: 1,
      outstandingPlanCents: 80000,
      actualControlSourceCounts: {
        automaticRule: 1,
        automaticDirect: 0,
        manual: 0,
      },
    });
    expect(july.specialBudgets).toEqual([
      {
        name: "Trip",
        plannedCents: 30000,
        actualCents: 12000,
        remainingCents: 18000,
      },
    ]);

    const june = snapshot.months.find((month: { monthKey: string }) =>
      month.monthKey === "2026-06"
    );
    expect(june.plannedFixedCostsCents).toBe(85000);
    expect(june.fixedCosts).toMatchObject({
      planSource: "month_close_snapshot",
      plannedCents: 85000,
      plannedItemCount: 1,
    });
    expect(snapshot.fixedCosts.currentPlan).toMatchObject({
      source: "active_fixed_costs",
      plannedCents: 90000,
      itemCount: 2,
      bookingDayKnownCount: 1,
      items: [
        { name: "Rent", plannedAmountCents: 80000, bookingDayOfMonth: 1 },
        { name: "Subscription", plannedAmountCents: 10000, bookingDayOfMonth: null },
      ],
    });
    expect(snapshot.accounts).toEqual([
      {
        name: "Bank",
        accountType: "bank",
        currencyCode: "EUR",
        isActive: true,
        currentBalanceCents: 432000,
      },
      {
        name: "Cash",
        accountType: "cash",
        currencyCode: "EUR",
        isActive: true,
        currentBalanceCents: 15000,
      },
    ]);
    expect(snapshot.dataQuality.warnings).toContain("UNASSIGNED_EXPENSES");

    const financialPayload = { ...snapshot, privacy: undefined };
    const serialized = JSON.stringify(financialPayload);
    for (const forbidden of [
      "salary secret",
      "merchant secret",
      "Employer",
      "Merchant",
      "DE123",
      "DE456",
      "importFingerprint",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("uses settlement results for coaching KPIs but keeps real account balances", () => {
    const { databasePath } = createFixture("0021_fin_131");
    const db = openReadOnlyDatabase(databasePath);
    const snapshot = buildSnapshot(db, {
      now: new Date("2026-07-15T12:00:00.000Z"),
      monthCount: 13,
      weekCount: 2,
    });
    db.close();

    const july = snapshot.months.find((month: { monthKey: string }) =>
      month.monthKey === "2026-07"
    );
    expect(july).toMatchObject({
      grossIncomeCents: 300000,
      refundCents: 0,
      totalExpenseCents: 188000,
      expenseCents: 178000,
      consumerExpenseCents: 138000,
      netCashflowCents: 92000,
    });
    expect(snapshot.accounts).toEqual([
      expect.objectContaining({ name: "Bank", currentBalanceCents: 432000 }),
      expect.objectContaining({ name: "Cash", currentBalanceCents: 15000 }),
    ]);
  });

  it("writes latest atomically and only versions changed financial data", () => {
    const { databasePath, outputDirectory } = createFixture();
    const first = collectSnapshot({
      databasePath,
      outputDirectory,
      now: new Date("2026-07-15T12:00:00.000Z"),
      weekCount: 2,
    });
    const second = collectSnapshot({
      databasePath,
      outputDirectory,
      now: new Date("2026-07-15T12:15:00.000Z"),
      weekCount: 2,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readdirSync(path.join(outputDirectory, "history"))).toHaveLength(1);
    const latest = JSON.parse(readFileSync(second.latestPath, "utf8"));
    expect(latest.capturedAt).toBe("2026-07-15T12:15:00.000Z");
    expect(latest.integrity.dataSha256).toBe(first.dataSha256);
  });

  it("keeps an intentionally empty closed-month fixed-cost snapshot at zero", () => {
    const { databasePath } = createFixture();
    const db = new Database(databasePath);
    db.prepare("INSERT INTO monthly_statuses VALUES (?, 'closed', ?)").run(
      "2026-08",
      "2026-09-01T00:00:00Z",
    );
    db.close();

    const readOnlyDb = openReadOnlyDatabase(databasePath);
    const snapshot = buildSnapshot(readOnlyDb, {
      now: new Date("2026-08-15T12:00:00.000Z"),
      monthCount: 13,
      weekCount: 2,
    });
    readOnlyDb.close();

    const august = snapshot.months.find((month: { monthKey: string }) =>
      month.monthKey === "2026-08"
    );
    expect(august.fixedCosts).toMatchObject({
      planSource: "month_close_snapshot",
      plannedCents: 0,
      plannedItemCount: 0,
    });
  });

  it("applies manual include and exclude overrides to fixed-cost controls", () => {
    const { databasePath } = createFixture();
    const db = new Database(databasePath);
    db.exec(`
      INSERT INTO transaction_fixed_cost_control_overrides VALUES (7, 'include');
      INSERT INTO transaction_fixed_cost_control_overrides VALUES (11, 'exclude');
    `);
    db.close();

    const readOnlyDb = openReadOnlyDatabase(databasePath);
    const snapshot = buildSnapshot(readOnlyDb, {
      now: new Date("2026-07-15T12:00:00.000Z"),
      monthCount: 13,
      weekCount: 2,
    });
    readOnlyDb.close();

    const july = snapshot.months.find((month: { monthKey: string }) =>
      month.monthKey === "2026-07"
    );
    expect(july.fixedCosts).toMatchObject({
      actualControlCents: 1000,
      actualControlCount: 1,
      actualControlSourceCounts: {
        automaticRule: 0,
        automaticDirect: 0,
        manual: 1,
      },
    });
    expect(july.unassignedExpenseCents).toBe(90000);
  });

  it("fails closed for an unknown BudgetBuddy schema", () => {
    const { databasePath } = createFixture("9999_unknown");
    const db = openReadOnlyDatabase(databasePath);
    expect(() =>
      buildSnapshot(db, { now: new Date("2026-07-15T12:00:00.000Z") }),
    ).toThrow("Unsupported BudgetBuddy schema version: 9999_unknown");
    db.close();
  });
});
