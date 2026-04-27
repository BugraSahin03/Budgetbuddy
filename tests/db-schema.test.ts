import { describe, expect, it } from "vitest";

import { getLatestSchemaVersion, migrations } from "@/src/db/schema";

describe("schema migrations", () => {
  it("contains migration for FIN-002", () => {
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0]?.id).toBe("0001_fin_002");
  });

  it("creates required core tables", () => {
    const sql = migrations[0]?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS accounts");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS categories");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS monthly_category_budgets");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS special_budgets");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS fixed_costs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS import_runs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS transactions");
  });

  it("enforces expense assignment and transaction type checks", () => {
    const sql = migrations[0]?.sql ?? "";

    expect(sql).toContain("transaction_type IN ('expense', 'income', 'transfer', 'refund')");
    expect(sql).toContain("transaction_type = 'expense' AND amount_cents < 0");
    expect(sql).toContain("transaction_type = 'income' AND amount_cents > 0");
    expect(sql).toContain("category_id IS NOT NULL AND special_budget_id IS NULL");
    expect(sql).toContain("category_id IS NULL AND special_budget_id IS NOT NULL");
    expect(sql).toContain("transaction_type = 'transfer'");
  });

  it("prepares import dedupe structures", () => {
    const sql = migrations[0]?.sql ?? "";

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS imported_transactions");
    expect(sql).toContain("dedupe_fingerprint TEXT NOT NULL UNIQUE");
    expect(sql).toContain("idx_transactions_import_fingerprint_unique");
  });

  it("exposes latest schema version", () => {
    expect(getLatestSchemaVersion()).toBe("0001_fin_002");
  });
});
