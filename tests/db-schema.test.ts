import { describe, expect, it } from "vitest";

import { getLatestSchemaVersion, migrations } from "@/src/db/schema";

describe("schema migrations", () => {
  it("contains migration for FIN-002", () => {
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations.some((migration) => migration.id === "0001_fin_002")).toBe(
      true,
    );
  });

  it("creates required core tables", () => {
    const sql = migrations.find((migration) => migration.id === "0001_fin_002")
      ?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS accounts");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS categories");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS monthly_category_budgets");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS special_budgets");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS fixed_costs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS import_runs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS transactions");
  });

  it("enforces expense assignment and transaction type checks", () => {
    const sql = migrations.find((migration) => migration.id === "0001_fin_002")
      ?.sql ?? "";

    expect(sql).toContain("transaction_type IN ('expense', 'income', 'transfer', 'refund')");
    expect(sql).toContain("transaction_type = 'expense' AND amount_cents < 0");
    expect(sql).toContain("transaction_type = 'income' AND amount_cents > 0");
    expect(sql).toContain("category_id IS NOT NULL AND special_budget_id IS NULL");
    expect(sql).toContain("category_id IS NULL AND special_budget_id IS NOT NULL");
    expect(sql).toContain("transaction_type = 'transfer'");
  });

  it("prepares import dedupe structures", () => {
    const sql = migrations.find((migration) => migration.id === "0001_fin_002")
      ?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS imported_transactions");
    expect(sql).toContain("dedupe_fingerprint TEXT NOT NULL UNIQUE");
    expect(sql).toContain("idx_transactions_import_fingerprint_unique");
  });

  it("contains migration for optional category icon metadata", () => {
    const sql = migrations.find((migration) => migration.id === "0002_fin_004")
      ?.sql;

    expect(sql).toContain("ALTER TABLE categories ADD COLUMN icon_name TEXT;");
  });

  it("contains migration for imported expenses without category assignment", () => {
    const sql = migrations.find((migration) => migration.id === "0003_fin_011b")
      ?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS transactions_new");
    expect(sql).toContain("source_type = 'import'");
    expect(sql).toContain("category_id IS NULL");
    expect(sql).toContain("special_budget_id IS NULL");
  });

  it("contains migration that deprecates manual fixed-cost transaction assignments", () => {
    const sql = migrations.find((migration) => migration.id === "0004_fin_025")
      ?.sql ?? "";

    expect(sql).toContain("fixed_cost_assignment_mode");
    expect(sql).toContain("deprecated");
  });

  it("contains migration for effective month key on transactions", () => {
    const sql = migrations.find((migration) => migration.id === "0005_fin_030")
      ?.sql ?? "";

    expect(sql).toContain("effective_month_key TEXT NOT NULL");
    expect(sql).toContain("substr(booking_date, 1, 7) AS effective_month_key");
    expect(sql).toContain("idx_transactions_effective_month_key");
  });

  it("contains migration for global category default budgets", () => {
    const sql = migrations.find((migration) => migration.id === "0006_fin_038")
      ?.sql ?? "";

    expect(sql).toContain("ALTER TABLE categories");
    expect(sql).toContain("default_budget_amount_cents INTEGER");
    expect(sql).toContain("default_budget_amount_cents >= 0");
  });

  it("contains migration that backfills global defaults from latest monthly budgets", () => {
    const sql = migrations.find((migration) => migration.id === "0007_fin_038b")
      ?.sql ?? "";

    expect(sql).toContain("UPDATE categories");
    expect(sql).toContain("FROM monthly_category_budgets");
    expect(sql).toContain("ORDER BY mb.month_key DESC");
    expect(sql).toContain("default_budget_amount_cents IS NULL");
  });

  it("contains migration that allows imported expenses to be assigned later", () => {
    const sql = migrations.find((migration) => migration.id === "0008_fin_040")
      ?.sql ?? "";

    expect(sql).toContain("source_type = 'import'");
    expect(sql).toContain("(category_id IS NULL AND special_budget_id IS NULL)");
    expect(sql).toContain("(category_id IS NOT NULL AND special_budget_id IS NULL)");
    expect(sql).toContain("(category_id IS NULL AND special_budget_id IS NOT NULL)");
  });

  it("contains migration for multi-month special budget projects", () => {
    const sql = migrations.find((migration) => migration.id === "0009_fin_065")
      ?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS special_budget_projects");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'active'");
    expect(sql).toContain("ALTER TABLE special_budgets");
    expect(sql).toContain("ADD COLUMN project_id INTEGER");
    expect(sql).toContain("idx_special_budgets_project_id");
  });

  it("contains migration for optional special budget project icons", () => {
    const sql = migrations.find((migration) => migration.id === "0010_fin_065b")
      ?.sql ?? "";

    expect(sql).toContain("ALTER TABLE special_budget_projects");
    expect(sql).toContain("ADD COLUMN icon_name TEXT");
  });

  it("contains migration for protected savings category", () => {
    const sql = migrations.find((migration) => migration.id === "0011_fin_072")
      ?.sql ?? "";

    expect(sql).toContain("ADD COLUMN system_key TEXT");
    expect(sql).toContain("idx_categories_system_key_unique");
    expect(sql).toContain("'Sparen'");
    expect(sql).toContain("'savings'");
    expect(sql).toContain("default_budget_amount_cents = NULL");
  });

  it("contains migration for fixed-cost snapshots on month close", () => {
    const sql = migrations.find((migration) => migration.id === "0012_fin_070")
      ?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS monthly_statuses");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'open'");
    expect(sql).toContain("fixed_cost_snapshot_created_at TEXT");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS monthly_fixed_cost_snapshots");
    expect(sql).toContain("planned_amount_cents_snapshot");
    expect(sql).toContain("idx_monthly_fixed_cost_snapshots_unique_cost");
  });

  it("contains migration for manual fixed-cost ordering", () => {
    const sql = migrations.find((migration) => migration.id === "0013_fin_081")
      ?.sql ?? "";

    expect(sql).toContain("ALTER TABLE fixed_costs");
    expect(sql).toContain("ADD COLUMN sort_order INTEGER");
    expect(sql).toContain("idx_fixed_costs_sort_order");
  });

  it("contains migration for month-scoped todos", () => {
    const sql = migrations.find((migration) => migration.id === "0014_fin_082")
      ?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS monthly_todos");
    expect(sql).toContain("month_key TEXT NOT NULL");
    expect(sql).toContain("is_done INTEGER NOT NULL DEFAULT 0");
    expect(sql).toContain("idx_monthly_todos_month_key");
  });

  it("exposes latest schema version", () => {
    expect(getLatestSchemaVersion()).toBe("0014_fin_082");
  });
});
