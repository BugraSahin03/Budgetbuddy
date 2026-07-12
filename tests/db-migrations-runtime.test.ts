import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyMigrations, migrations } from "@/src/db/schema";

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
              'monthly_fixed_cost_snapshots',
              'monthly_statuses',
              'special_budget_projects',
              'special_budgets',
              'fixed_costs',
              'import_runs',
              'income_deduction_rules',
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
      "income_deduction_rules",
      "monthly_category_budgets",
      "monthly_fixed_cost_snapshots",
      "monthly_statuses",
      "special_budget_projects",
      "special_budgets",
      "transactions",
    ]);
  });

  it("adds optional transaction display-name override without replacing descriptions", () => {
    const columns = db
      .prepare("PRAGMA table_info(transactions)")
      .all() as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain(
      "display_name_override",
    );

    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          currency_code,
          description,
          display_name_override,
          source_type
        )
        VALUES (?, 'income', '2033-01-02', '2033-01', 120000, 'EUR', 'Originaltext', 'Lesbarer Name', 'manual')
      `,
    ).run(account.id);

    const row = db
      .prepare(
        `
          SELECT
            description,
            display_name_override AS displayNameOverride
          FROM transactions
          WHERE description = 'Originaltext'
        `,
      )
      .get() as { description: string; displayNameOverride: string };

    expect(row).toEqual({
      description: "Originaltext",
      displayNameOverride: "Lesbarer Name",
    });
  });

  it("preserves current transaction references while adding income deductions", () => {
    const legacyDb = new Database(":memory:");
    legacyDb.exec("PRAGMA foreign_keys = ON;");
    legacyDb.exec(`
      CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const migration of migrations) {
      if (migration.id === "0018_fin_120") break;
      legacyDb.exec(migration.sql);
      legacyDb.prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)").run(
        migration.id,
        migration.name,
      );
    }

    const account = legacyDb.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as AccountRow;
    const transaction = legacyDb.prepare(`
      INSERT INTO transactions (
        account_id, transaction_type, booking_date, effective_month_key, amount_cents,
        currency_code, description, source_type, import_fingerprint
      ) VALUES (?, 'expense', '2026-07-02', '2026-07', -30000, 'EUR', 'PKV', 'import', 'fin120-fingerprint')
    `).run(account.id);
    const transactionId = Number(transaction.lastInsertRowid);
    const importRun = legacyDb.prepare(`
      INSERT INTO import_runs (source_format, source_filename, status)
      VALUES ('sparkasse_csv', 'pkv.csv', 'completed')
    `).run();
    legacyDb.prepare(`
      INSERT INTO imported_transactions (
        transaction_id, import_run_id, source_row_index, account_iban, booking_date,
        amount_cents, dedupe_fingerprint
      ) VALUES (?, ?, 0, 'DE001', '2026-07-02', -30000, 'fin120-fingerprint')
    `).run(transactionId, Number(importRun.lastInsertRowid));
    legacyDb.prepare(`
      INSERT INTO transaction_fixed_cost_control_overrides (transaction_id, mode)
      VALUES (?, 'exclude')
    `).run(transactionId);

    applyMigrations(legacyDb);

    expect((legacyDb.prepare("SELECT COUNT(*) AS count FROM imported_transactions").get() as { count: number }).count).toBe(1);
    expect((legacyDb.prepare("SELECT COUNT(*) AS count FROM transaction_fixed_cost_control_overrides").get() as { count: number }).count).toBe(1);
    expect(legacyDb.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    legacyDb.close();
  });

  it("stores special budget monthly shares under a project", () => {
    const project = db
      .prepare(
        `
          SELECT
            sbp.name,
            sbp.status,
            COUNT(sb.id) AS monthCount
          FROM special_budget_projects sbp
          INNER JOIN special_budgets sb ON sb.project_id = sbp.id
          GROUP BY sbp.id, sbp.name, sbp.status
        `,
      )
      .get() as { name: string; status: string; monthCount: number } | undefined;

    expect(project).toBeUndefined();

    db.prepare(
      `
        INSERT INTO special_budget_projects (name, status)
        VALUES ('Test Vorhaben', 'active')
      `,
    ).run();

    const projectId = (db
      .prepare("SELECT id FROM special_budget_projects WHERE name = 'Test Vorhaben'")
      .get() as { id: number }).id;

    db.prepare(
      `
        INSERT INTO special_budgets (project_id, name, month_key, planned_amount_cents, is_active)
        VALUES (?, 'Test Vorhaben', '2030-01', 10000, 1)
      `,
    ).run(projectId);

    const row = db
      .prepare(
        `
          SELECT sb.project_id AS projectId, sbp.status
          FROM special_budgets sb
          INNER JOIN special_budget_projects sbp ON sbp.id = sb.project_id
          WHERE sb.name = 'Test Vorhaben'
        `,
      )
      .get() as { projectId: number; status: string };

    expect(row.projectId).toBe(projectId);
    expect(row.status).toBe("active");
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
          effective_month_key,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-04-27', '2026-04', -1250, 'Einkauf Test', 'manual', ?)
      `,
    ).run(account.id, category.id);

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            description,
            source_type
          )
          VALUES (?, 'expense', '2026-04-27', '2026-04', -500, 'Ungueltig', 'manual')
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
          effective_month_key,
          amount_cents,
          description,
          source_type
        )
        VALUES (?, ?, 'transfer', '2026-04-27', '2026-04', -5000, 'ATM Auszahlung', 'manual')
      `,
    ).run(sourceAccount.id, destinationAccount.id);

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            description,
            source_type
          )
          VALUES (?, 'transfer', '2026-04-27', '2026-04', -1000, 'Ohne Zielkonto', 'manual')
        `,
      ).run(sourceAccount.id),
    ).toThrow();

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          description,
          source_type,
          import_run_id,
          import_fingerprint
        )
        VALUES (?, 'income', '2026-04-27', '2026-04', 100000, 'Gehalt', 'import', ?, 'fp-1')
      `,
    ).run(sourceAccount.id, importRunId);

    expect(() =>
      db.prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            description,
            source_type,
            import_run_id,
            import_fingerprint
          )
          VALUES (?, 'income', '2026-04-27', '2026-04', 100000, 'Duplikat', 'import', ?, 'fp-1')
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
            effective_month_key,
            amount_cents,
            description,
            source_type
          )
          VALUES (?, 'income', '2026-04-27', '2026-04', -1, 'Ungueltig Einkommen', 'manual')
        `,
      ).run(account.id),
    ).toThrow();

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          description,
          source_type
        )
        VALUES (?, 'income', '2026-04-27', '2026-04', 1, 'Gueltig Einkommen', 'manual')
      `,
    ).run(account.id);
  });

  it("adds icon metadata column for categories", () => {
    const columns = db
      .prepare("PRAGMA table_info(categories)")
      .all() as Array<{ name: string }>;

    expect(columns.some((column) => column.name === "icon_name")).toBe(true);
  });

  it("adds effective month key column on transactions", () => {
    const columns = db
      .prepare("PRAGMA table_info(transactions)")
      .all() as Array<{ name: string; notnull: number }>;

    const effectiveMonthColumn = columns.find(
      (column) => column.name === "effective_month_key",
    );

    expect(effectiveMonthColumn).toBeDefined();
    expect(effectiveMonthColumn?.notnull).toBe(1);
  });

  it("adds global default budget column on categories", () => {
    const columns = db
      .prepare("PRAGMA table_info(categories)")
      .all() as Array<{ name: string }>;

    expect(
      columns.some((column) => column.name === "default_budget_amount_cents"),
    ).toBe(true);
  });

  it("adds protected savings category metadata and seed row", () => {
    const columns = db
      .prepare("PRAGMA table_info(categories)")
      .all() as Array<{ name: string }>;
    const savings = db
      .prepare(
        `
          SELECT
            name,
            color_hex AS colorHex,
            icon_name AS iconName,
            system_key AS systemKey,
            is_active AS isActive,
            is_default AS isDefault,
            default_budget_amount_cents AS defaultBudgetAmountCents
          FROM categories
          WHERE system_key = 'savings'
          LIMIT 1
        `,
      )
      .get() as
      | {
          name: string;
          colorHex: string;
          iconName: string;
          systemKey: string;
          isActive: number;
          isDefault: number;
          defaultBudgetAmountCents: number | null;
        }
      | undefined;

    expect(columns.some((column) => column.name === "system_key")).toBe(true);
    expect(savings).toEqual({
      name: "Sparen",
      colorHex: "#D9F7B5",
      iconName: "↟",
      systemKey: "savings",
      isActive: 1,
      isDefault: 1,
      defaultBudgetAmountCents: null,
    });
  });

  it("backfills effective month key when migrating legacy transaction rows", () => {
    const legacyDb = new Database(":memory:");
    legacyDb.exec("PRAGMA foreign_keys = ON;");
    legacyDb.exec(
      `
        CREATE TABLE app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE schema_migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
    );

    for (const migration of migrations) {
      if (
        migration.id === "0005_fin_030" ||
        migration.id === "0008_fin_040" ||
        migration.id === "0018_fin_120"
      ) {
        continue;
      }

      legacyDb.exec(migration.sql);
      legacyDb
        .prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)")
        .run(migration.id, migration.name);
    }

    const account = legacyDb
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;
    const category = legacyDb
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as CategoryRow;

    legacyDb
      .prepare(
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
          VALUES (?, 'expense', '2026-04-27', -1299, 'Legacy Buchung', 'manual', ?)
        `,
      )
      .run(account.id, category.id);

    applyMigrations(legacyDb);

    const migratedRow = legacyDb
      .prepare(
        `
          SELECT effective_month_key AS effectiveMonthKey
          FROM transactions
          WHERE description = 'Legacy Buchung'
          LIMIT 1
        `,
      )
      .get() as { effectiveMonthKey: string } | undefined;

    expect(migratedRow?.effectiveMonthKey).toBe("2026-04");

    legacyDb.close();
  });

  it("backfills global default category budgets from the latest existing monthly value", () => {
    const legacyDb = new Database(":memory:");
    legacyDb.exec("PRAGMA foreign_keys = ON;");
    legacyDb.exec(
      `
        CREATE TABLE app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE schema_migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
    );

    for (const migration of migrations) {
      if (migration.id === "0007_fin_038b") {
        continue;
      }

      legacyDb.exec(migration.sql);
      legacyDb
        .prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)")
        .run(migration.id, migration.name);
    }

    const einkauf = legacyDb
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as CategoryRow;

    legacyDb.prepare(
      `
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES
          ('2026-05', ?, 18000),
          ('2026-06', ?, 24000)
      `,
    ).run(einkauf.id, einkauf.id);

    applyMigrations(legacyDb);

    const categoryRow = legacyDb.prepare(
      `
        SELECT default_budget_amount_cents AS defaultBudgetAmountCents
        FROM categories
        WHERE id = ?
      `,
    ).get(einkauf.id) as { defaultBudgetAmountCents: number | null };

    expect(categoryRow.defaultBudgetAmountCents).toBe(24000);

    legacyDb.close();
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
          effective_month_key,
          amount_cents,
          description,
          source_type
        )
        VALUES (?, 'expense', '2026-05-22', '2026-05', -1599, 'Import Test Ausgabe', 'import')
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

  it("allows imported expenses with a later category assignment", () => {
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
          effective_month_key,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-05-22', '2026-05', -1599, 'Import Test Ausgabe mit Kategorie', 'import', ?)
      `,
    ).run(account.id, category.id);

    const inserted = db
      .prepare(
        `
          SELECT id
          FROM transactions
          WHERE description = 'Import Test Ausgabe mit Kategorie'
            AND source_type = 'import'
            AND category_id = ?
        `,
      )
      .get(category.id) as { id: number } | undefined;

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
          effective_month_key,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-04-15', '2026-04', -1500, 'Kino', 'manual', ?)
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

  it("stores fixed-cost assignment mode as deprecated in app_meta", () => {
    const row = db
      .prepare("SELECT value FROM app_meta WHERE key = 'fixed_cost_assignment_mode' LIMIT 1")
      .get() as { value?: string } | undefined;

    expect(row?.value).toBe("deprecated");
  });

  it("adds nullable source row index metadata for imported transactions", () => {
    const columns = db
      .prepare("PRAGMA table_info(imported_transactions)")
      .all() as Array<{ name: string }>;

    expect(columns.some((column) => column.name === "source_row_index")).toBe(true);
  });
});
