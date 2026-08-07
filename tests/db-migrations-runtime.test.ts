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
              'monthly_category_snapshots',
              'monthly_fixed_cost_snapshots',
              'monthly_special_budget_snapshots',
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
      "monthly_category_snapshots",
      "monthly_fixed_cost_snapshots",
      "monthly_special_budget_snapshots",
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

  it("backfills closed and reopened legacy months once without changing assignments", () => {
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
      if (migration.id === "0019_fin_125") break;
      legacyDb.exec(migration.sql);
      legacyDb.prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)").run(
        migration.id,
        migration.name,
      );
    }

    const account = legacyDb
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;
    const category = legacyDb
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as CategoryRow;

    legacyDb.prepare(
      `
        UPDATE categories
        SET name = 'Legacy Einkauf', icon_name = 'LE', default_budget_amount_cents = 22000
        WHERE id = ?
      `,
    ).run(category.id);
    legacyDb.exec(`
      INSERT INTO monthly_statuses (
        month_key, status, fixed_cost_snapshot_created_at, closed_at, reopened_at
      ) VALUES
        ('2040-01', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
        ('2040-02', 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
    legacyDb.prepare(
      `
        INSERT INTO transactions (
          account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, description, source_type, category_id
        ) VALUES (?, 'expense', '2040-01-10', '2040-01', -3300, 'Legacy assignment', 'manual', ?)
      `,
    ).run(account.id, category.id);
    const projectId = Number(
      legacyDb.prepare(
        `
          INSERT INTO special_budget_projects (name, status, icon_name)
          VALUES ('Legacy Reise', 'active', 'LR')
        `,
      ).run().lastInsertRowid,
    );
    const specialBudgetId = Number(
      legacyDb.prepare(
        `
          INSERT INTO special_budgets (
            project_id, name, month_key, planned_amount_cents, is_active
          ) VALUES (?, 'Legacy Reise', '2040-01', 45000, 1)
        `,
      ).run(projectId).lastInsertRowid,
    );

    applyMigrations(legacyDb);

    const categorySnapshot = legacyDb.prepare(
      `
        SELECT
          name_snapshot AS name,
          icon_name_snapshot AS iconName,
          budget_amount_cents_snapshot AS budgetAmountCents
        FROM monthly_category_snapshots
        WHERE month_key = '2040-01' AND category_id = ?
      `,
    ).get(category.id);
    const reopenedSnapshotCount = (
      legacyDb.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_snapshots
          WHERE month_key = '2040-02'
        `,
      ).get() as { count: number }
    ).count;
    const specialSnapshot = legacyDb.prepare(
      `
        SELECT
          project_id AS projectId,
          name_snapshot AS name,
          icon_name_snapshot AS iconName,
          planned_amount_cents_snapshot AS plannedAmountCents
        FROM monthly_special_budget_snapshots
        WHERE month_key = '2040-01' AND special_budget_id = ?
      `,
    ).get(specialBudgetId);

    expect(categorySnapshot).toEqual({
      name: "Legacy Einkauf",
      iconName: "LE",
      budgetAmountCents: 22000,
    });
    expect(reopenedSnapshotCount).toBeGreaterThan(0);
    expect(specialSnapshot).toEqual({
      projectId,
      name: "Legacy Reise",
      iconName: "LR",
      plannedAmountCents: 45000,
    });
    expect(
      legacyDb.prepare(
        "SELECT COUNT(*) AS count FROM transactions WHERE description = 'Legacy assignment' AND category_id = ?",
      ).get(category.id),
    ).toEqual({ count: 1 });

    legacyDb.prepare(
      "UPDATE categories SET name = 'Neuer Live-Name', icon_name = 'NN' WHERE id = ?",
    ).run(category.id);
    applyMigrations(legacyDb);

    expect(
      legacyDb.prepare(
        `
          SELECT name_snapshot AS name, icon_name_snapshot AS iconName
          FROM monthly_category_snapshots
          WHERE month_key = '2040-01' AND category_id = ?
        `,
      ).get(category.id),
    ).toEqual({ name: "Legacy Einkauf", iconName: "LE" });
    expect(legacyDb.prepare("PRAGMA foreign_key_check").all()).toEqual([]);

    legacyDb.close();
  });

  it("finishes FIN-125 safely when the status marker column already exists", () => {
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
      if (migration.id === "0019_fin_125") break;
      legacyDb.exec(migration.sql);
      legacyDb.prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)").run(
        migration.id,
        migration.name,
      );
    }

    legacyDb.exec(
      "ALTER TABLE monthly_statuses ADD COLUMN budget_snapshot_created_at TEXT;",
    );
    legacyDb.exec(`
      INSERT INTO monthly_statuses (month_key, status, closed_at)
      VALUES ('2040-03', 'closed', CURRENT_TIMESTAMP);
    `);

    applyMigrations(legacyDb);

    expect(
      legacyDb.prepare(
        `
          SELECT budget_snapshot_created_at AS snapshotCreatedAt
          FROM monthly_statuses
          WHERE month_key = '2040-03'
        `,
      ).get(),
    ).toMatchObject({ snapshotCreatedAt: expect.any(String) });
    expect(
      legacyDb.prepare(
        `
          SELECT COUNT(*) AS count
          FROM sqlite_master
          WHERE type = 'table'
            AND name IN ('monthly_category_snapshots', 'monthly_special_budget_snapshots')
        `,
      ).get(),
    ).toEqual({ count: 2 });
    expect(
      legacyDb.prepare(
        "SELECT COUNT(*) AS count FROM schema_migrations WHERE id = '0019_fin_125'",
      ).get(),
    ).toEqual({ count: 1 });

    legacyDb.close();
  });

  it("enforces FIN-125 snapshot uniqueness, amount checks and references", () => {
    const categoryId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as CategoryRow
    ).id;
    const otherCategoryId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Freizeit'").get() as CategoryRow
    ).id;

    db.exec(`
      INSERT INTO monthly_statuses (
        month_key, status, budget_snapshot_created_at, closed_at
      ) VALUES ('2040-04', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
    db.prepare(
      `
        INSERT INTO monthly_category_snapshots (
          month_key, category_id, name_snapshot, is_active_snapshot,
          is_visible_snapshot, is_savings_snapshot, budget_amount_cents_snapshot
        ) VALUES ('2040-04', ?, 'Snapshot', 1, 1, 0, 1000)
      `,
    ).run(categoryId);

    expect(() =>
      db.prepare(
        `
          INSERT INTO monthly_category_snapshots (
            month_key, category_id, name_snapshot, is_active_snapshot,
            is_visible_snapshot, is_savings_snapshot, budget_amount_cents_snapshot
          ) VALUES ('2040-04', ?, 'Doppelt', 1, 1, 0, 2000)
        `,
      ).run(categoryId),
    ).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      db.prepare(
        `
          INSERT INTO monthly_category_snapshots (
            month_key, category_id, name_snapshot, is_active_snapshot,
            is_visible_snapshot, is_savings_snapshot, budget_amount_cents_snapshot
          ) VALUES ('2040-04', ?, 'Negativ', 1, 1, 0, -1)
        `,
      ).run(otherCategoryId),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      db.prepare(
        `
          INSERT INTO monthly_category_snapshots (
            month_key, category_id, name_snapshot, is_active_snapshot,
            is_visible_snapshot, is_savings_snapshot
          ) VALUES ('2040-04', 999999, 'Fehlende Referenz', 1, 1, 0)
        `,
      ).run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("upgrades legacy runtime rules and backfills only explicit controls idempotently", () => {
    const legacyDb = new Database(":memory:");
    legacyDb.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(legacyDb);
    legacyDb.exec(`
      DROP TABLE transaction_fixed_cost_control_matches;
      DELETE FROM schema_migrations WHERE id = '0020_fin_126';
      UPDATE app_meta SET value = '0019_fin_125' WHERE key = 'schema_version';

      CREATE TABLE import_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pattern TEXT NOT NULL,
        match_field TEXT NOT NULL,
        target_type TEXT NOT NULL,
        category_id INTEGER,
        special_budget_id INTEGER,
        is_active INTEGER NOT NULL,
        priority INTEGER NOT NULL
      );
    `);

    const category = legacyDb
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as CategoryRow;
    const account = legacyDb
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as AccountRow;
    const importRunId = Number(
      legacyDb
        .prepare(
          `
            INSERT INTO import_runs (source_format, source_filename, status)
            VALUES ('sparkasse_csv', 'legacy-fin126.csv', 'completed')
          `,
        )
        .run().lastInsertRowid,
    );

    legacyDb
      .prepare(
        `
          INSERT INTO import_rules (
            id, name, pattern, match_field, target_type,
            category_id, special_budget_id, is_active, priority
          ) VALUES
            (1, 'Hoeher priorisierte Kategorie', 'SHADOWED', 'description', 'category', ?, NULL, 1, 1),
            (2, 'N26 Transfer-Kandidat', 'N26-Fix.', 'combined', 'transfer_cash', NULL, NULL, 1, 5),
            (3, 'Nachrangiger Shadow-Transfer', 'SHADOWED', 'description', 'transfer_cash', NULL, NULL, 1, 10),
            (4, 'N26 Inaktive Kontrolle', 'INACTIVE-CONTROL', 'description', 'transfer_cash', NULL, NULL, 0, 1),
            (5, 'N26 Nachrangige Kontrolle', 'N26', 'combined', 'transfer_cash', NULL, NULL, 1, 20)
        `,
      )
      .run(category.id);

    legacyDb
      .prepare(
        `
          INSERT INTO fixed_costs (
            name, planned_amount_cents, booking_day_of_month,
            payment_note, note, is_active
          ) VALUES ('Miete Musterhaushalt', 143000, 1, 'MIETE-MUSTER', '', 1)
        `,
      )
      .run();

    const insertTransaction = legacyDb.prepare(
      `
        INSERT INTO transactions (
          account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, counterparty_name,
          source_type, import_run_id, import_fingerprint
        ) VALUES (?, 'expense', ?, '2026-08', ?, 'EUR', ?, ?, 'import', ?, ?)
      `,
    );
    const insertImportedTransaction = legacyDb.prepare(
      `
        INSERT INTO imported_transactions (
          transaction_id, import_run_id, source_row_index, account_iban,
          booking_date, amount_cents, counterparty, purpose, dedupe_fingerprint
        ) VALUES (?, ?, ?, 'DE001', ?, ?, ?, ?, ?)
      `,
    );
    const addLegacyImport = (params: {
      rowIndex: number;
      bookingDate: string;
      amountCents: number;
      description: string;
      counterparty: string;
      purpose: string;
      fingerprint: string;
    }): number => {
      const transactionId = Number(
        insertTransaction.run(
          account.id,
          params.bookingDate,
          params.amountCents,
          params.description,
          params.counterparty,
          importRunId,
          params.fingerprint,
        ).lastInsertRowid,
      );
      insertImportedTransaction.run(
        transactionId,
        importRunId,
        params.rowIndex,
        params.bookingDate,
        params.amountCents,
        params.counterparty,
        params.purpose,
        params.fingerprint,
      );
      return transactionId;
    };

    const automaticId = addLegacyImport({
      rowIndex: 0,
      bookingDate: "2026-08-02",
      amountCents: -6000,
      description: "UEBERWEISUNG | Monatsblock",
      counterparty: "N26-Fix. Empfaenger",
      purpose: "Monatsblock",
      fingerprint: "legacy-fin126-automatic",
    });
    const excludedId = addLegacyImport({
      rowIndex: 1,
      bookingDate: "2026-08-03",
      amountCents: -6000,
      description: "UEBERWEISUNG | N26-Fix. ausgeschlossen",
      counterparty: "N26 Bank",
      purpose: "N26-Fix. ausgeschlossen",
      fingerprint: "legacy-fin126-excluded",
    });
    const includedId = addLegacyImport({
      rowIndex: 2,
      bookingDate: "2026-08-04",
      amountCents: -6000,
      description: "UEBERWEISUNG | N26-Fix. manuell",
      counterparty: "N26 Bank",
      purpose: "N26-Fix. manuell",
      fingerprint: "legacy-fin126-included",
    });
    const directFixedCostId = addLegacyImport({
      rowIndex: 3,
      bookingDate: "2026-08-05",
      amountCents: -143000,
      description: "DAUERAUFTRAG | MIETE-MUSTER",
      counterparty: "Muster Hausverwaltung",
      purpose: "MIETE-MUSTER",
      fingerprint: "legacy-fin126-direct",
    });
    const inactiveRuleId = addLegacyImport({
      rowIndex: 4,
      bookingDate: "2026-08-06",
      amountCents: -2000,
      description: "LASTSCHRIFT | INACTIVE-CONTROL",
      counterparty: "Muster Anbieter",
      purpose: "INACTIVE-CONTROL",
      fingerprint: "legacy-fin126-inactive",
    });
    const shadowedId = addLegacyImport({
      rowIndex: 5,
      bookingDate: "2026-08-07",
      amountCents: -2500,
      description: "LASTSCHRIFT | SHADOWED",
      counterparty: "Muster Anbieter",
      purpose: "SHADOWED",
      fingerprint: "legacy-fin126-shadowed",
    });

    legacyDb
      .prepare(
        `
          INSERT INTO transaction_fixed_cost_control_overrides (transaction_id, mode)
          VALUES (?, 'exclude'), (?, 'include'), (?, 'include')
        `,
      )
      .run(excludedId, includedId, directFixedCostId);

    applyMigrations(legacyDb);

    expect(
      (
        legacyDb
          .prepare("PRAGMA table_info(import_rules)")
          .all() as Array<{ name: string }>
      ).map((column) => column.name),
    ).toContain("rule_purpose");
    expect(
      legacyDb
        .prepare(
          `
            SELECT id, rule_purpose AS rulePurpose
            FROM import_rules
            ORDER BY id
          `,
        )
        .all(),
    ).toEqual([
      { id: 1, rulePurpose: "assignment" },
      { id: 2, rulePurpose: "fixed_cost_control" },
      { id: 3, rulePurpose: "cash_transfer" },
      { id: 4, rulePurpose: "fixed_cost_control" },
      { id: 5, rulePurpose: "fixed_cost_control" },
    ]);

    const matches = legacyDb
      .prepare(
        `
          SELECT
            transaction_id AS transactionId,
            import_rule_id AS ruleId,
            rule_name_snapshot AS ruleName,
            rule_pattern_snapshot AS pattern,
            rule_match_field_snapshot AS matchField
          FROM transaction_fixed_cost_control_matches
          ORDER BY transaction_id
        `,
      )
      .all() as Array<{
      transactionId: number;
      ruleId: number;
      ruleName: string;
      pattern: string;
      matchField: string;
    }>;

    expect(matches).toEqual([
      {
        transactionId: automaticId,
        ruleId: 2,
        ruleName: "N26 Transfer-Kandidat",
        pattern: "N26-Fix.",
        matchField: "combined",
      },
      {
        transactionId: excludedId,
        ruleId: 2,
        ruleName: "N26 Transfer-Kandidat",
        pattern: "N26-Fix.",
        matchField: "combined",
      },
      {
        transactionId: includedId,
        ruleId: 2,
        ruleName: "N26 Transfer-Kandidat",
        pattern: "N26-Fix.",
        matchField: "combined",
      },
    ]);
    expect(matches.map((row) => row.transactionId)).not.toContain(directFixedCostId);
    expect(matches.map((row) => row.transactionId)).not.toContain(inactiveRuleId);
    expect(matches.map((row) => row.transactionId)).not.toContain(shadowedId);
    expect(
      legacyDb
        .prepare(
          `
            SELECT mode
            FROM transaction_fixed_cost_control_overrides
            WHERE transaction_id = ?
          `,
        )
        .get(includedId),
    ).toEqual({ mode: "include" });
    expect(
      legacyDb
        .prepare(
          `
            SELECT mode
            FROM transaction_fixed_cost_control_overrides
            WHERE transaction_id = ?
          `,
        )
        .get(excludedId),
    ).toEqual({ mode: "exclude" });
    expect(
      legacyDb
        .prepare(
          `
            SELECT mode
            FROM transaction_fixed_cost_control_overrides
            WHERE transaction_id = ?
          `,
        )
        .get(directFixedCostId),
    ).toEqual({ mode: "include" });
    expect(
      legacyDb
        .prepare(
          `
            SELECT control.transaction_id AS transactionId
            FROM transaction_fixed_cost_control_matches control
            LEFT JOIN transaction_fixed_cost_control_overrides override
              ON override.transaction_id = control.transaction_id
            WHERE COALESCE(override.mode, '') != 'exclude'
            ORDER BY control.transaction_id
          `,
        )
        .all(),
    ).toEqual([
      { transactionId: automaticId },
      { transactionId: includedId },
    ]);
    expect(
      legacyDb
        .prepare(
          `
            SELECT transaction_id AS transactionId
            FROM transaction_fixed_cost_control_overrides
            WHERE mode = 'include'
            ORDER BY transaction_id
          `,
        )
        .all(),
    ).toEqual([
      { transactionId: includedId },
      { transactionId: directFixedCostId },
    ]);

    applyMigrations(legacyDb);
    legacyDb
      .prepare("DELETE FROM schema_migrations WHERE id = '0020_fin_126'")
      .run();
    applyMigrations(legacyDb);

    expect(
      (
        legacyDb
          .prepare(
            "SELECT COUNT(*) AS count FROM transaction_fixed_cost_control_matches",
          )
          .get() as { count: number }
      ).count,
    ).toBe(3);
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
        migration.id === "0018_fin_120" ||
        migration.id === "0019_fin_125"
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
