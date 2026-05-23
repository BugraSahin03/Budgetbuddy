import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyMigrations } from "@/src/db/schema";

type AccountRow = {
  id: number;
};

type CategoryRow = {
  id: number;
};

describe("database migrations runtime behavior", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates required FIN-002 tables", () => {
    const names = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name IN (
              'accounts',
              'categories',
              'monthly_category_budgets',
              'special_budgets',
              'fixed_costs',
              'import_runs',
              'transactions',
              'imported_transactions'
            )
          ORDER BY name
        `,
      )
      .all() as Array<{ name: string }>;

    expect(names.map((row) => row.name)).toEqual([
      "accounts",
      "categories",
      "fixed_costs",
      "import_runs",
      "imported_transactions",
      "monthly_category_budgets",
      "special_budgets",
      "transactions",
    ]);
  });

  it("enforces expense assignment constraint", () => {
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;
    const category = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as CategoryRow;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-04-27', -1250, 'Einkauf Test', 'manual', ?)
      `,
    ).run(account.id, category.id);

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            amount_cents,
            description,
            source_type
          )
          VALUES (?, 'expense', '2026-04-27', -500, 'Ungueltig', 'manual')
        `,
      ).run(account.id),
    ).toThrow();
  });

  it("enforces transfer shape and import dedupe uniqueness", () => {
    const sourceAccount = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;
    const destinationAccount = db
      .prepare("SELECT id FROM accounts WHERE name = 'Bargeld'")
      .get() as AccountRow;

    const runResult = db
      .prepare(
        `
          INSERT INTO import_runs (source_format, source_filename, status)
          VALUES ('sparkasse_csv', 'sample.csv', 'completed')
        `,
      )
      .run();
    const importRunId = Number(runResult.lastInsertRowid);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          destination_account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type
        )
        VALUES (?, ?, 'transfer', '2026-04-27', -5000, 'ATM Auszahlung', 'manual')
      `,
    ).run(sourceAccount.id, destinationAccount.id);

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            amount_cents,
            description,
            source_type
          )
          VALUES (?, 'transfer', '2026-04-27', -1000, 'Ohne Zielkonto', 'manual')
        `,
      ).run(sourceAccount.id),
    ).toThrow();

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type,
          import_run_id,
          import_fingerprint
        )
        VALUES (?, 'income', '2026-04-27', 100000, 'Gehalt', 'import', ?, 'fp-1')
      `,
    ).run(sourceAccount.id, importRunId);

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            amount_cents,
            description,
            source_type,
            import_run_id,
            import_fingerprint
          )
          VALUES (?, 'income', '2026-04-27', 100000, 'Duplikat', 'import', ?, 'fp-1')
        `,
      ).run(sourceAccount.id, importRunId),
    ).toThrow();
  });

  it("enforces amount sign convention by transaction type", () => {
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            amount_cents,
            description,
            source_type
          )
          VALUES (?, 'income', '2026-04-27', -1, 'Ungueltig Einkommen', 'manual')
        `,
      ).run(account.id),
    ).toThrow();

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type
        )
        VALUES (?, 'income', '2026-04-27', 1, 'Gueltig Einkommen', 'manual')
      `,
    ).run(account.id);
  });

  it("adds icon metadata column for categories", () => {
    const columns = db
      .prepare("PRAGMA table_info(categories)")
      .all() as Array<{ name: string }>;

    expect(columns.some((column) => column.name === "icon_name")).toBe(true);
  });

  it("allows imported expenses without assignment", () => {
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type
        )
        VALUES (?, 'expense', '2026-05-22', -1599, 'Import Test Ausgabe', 'import')
      `,
    ).run(account.id);

    const inserted = db
      .prepare(
        `
          SELECT id
          FROM transactions
          WHERE description = 'Import Test Ausgabe'
            AND source_type = 'import'
        `,
      )
      .get() as { id: number } | undefined;

    expect(inserted?.id).toBeDefined();
  });

  it("keeps historical references when a category is deactivated", () => {
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;
    const category = db
      .prepare("SELECT id FROM categories WHERE name = 'Freizeit'")
      .get() as CategoryRow;

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (
          month_key,
          category_id,
          budget_amount_cents
        )
        VALUES ('2026-04', ?, 18000)
      `,
    ).run(category.id);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-04-15', -1500, 'Kino', 'manual', ?)
      `,
    ).run(account.id, category.id);

    db.prepare("UPDATE categories SET is_active = 0 WHERE id = ?").run(category.id);

    const deactivated = db
      .prepare("SELECT is_active FROM categories WHERE id = ?")
      .get(category.id) as { is_active: number };
    const transactionCount = db
      .prepare("SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?")
      .get(category.id) as { count: number };
    const budgetCount = db
      .prepare(
        "SELECT COUNT(*) AS count FROM monthly_category_budgets WHERE category_id = ?",
      )
      .get(category.id) as { count: number };

    expect(deactivated.is_active).toBe(0);
    expect(transactionCount.count).toBe(1);
    expect(budgetCount.count).toBe(1);
  });
});
