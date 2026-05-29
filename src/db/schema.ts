import type Database from "better-sqlite3";

export type Migration = {
  id: string;
  name: string;
  sql: string;
};

const schemaBootstrapSql = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

const fin002MigrationSql = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'cash', 'virtual')),
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color_hex TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_category_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_key TEXT NOT NULL CHECK (length(month_key) = 7 AND substr(month_key, 5, 1) = '-'),
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  budget_amount_cents INTEGER NOT NULL CHECK (budget_amount_cents >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (month_key, category_id)
);

CREATE TABLE IF NOT EXISTS special_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  month_key TEXT NOT NULL CHECK (length(month_key) = 7 AND substr(month_key, 5, 1) = '-'),
  planned_amount_cents INTEGER NOT NULL CHECK (planned_amount_cents >= 0),
  note TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, month_key)
);

CREATE TABLE IF NOT EXISTS fixed_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  planned_amount_cents INTEGER NOT NULL CHECK (planned_amount_cents >= 0),
  booking_day_of_month INTEGER CHECK (booking_day_of_month BETWEEN 1 AND 31),
  payment_note TEXT,
  note TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_format TEXT NOT NULL CHECK (source_format IN ('sparkasse_csv', 'sparkasse_camt', 'unknown')),
  source_filename TEXT NOT NULL,
  source_file_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  detected_rows INTEGER NOT NULL DEFAULT 0 CHECK (detected_rows >= 0),
  imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  duplicate_rows INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  destination_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund')),
  booking_date TEXT NOT NULL,
  value_date TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  description TEXT NOT NULL,
  counterparty_name TEXT,
  counterparty_iban TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'import')),
  import_run_id INTEGER REFERENCES import_runs(id) ON DELETE SET NULL,
  import_fingerprint TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  special_budget_id INTEGER REFERENCES special_budgets(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (transaction_type = 'expense' AND amount_cents < 0)
    OR (transaction_type = 'transfer' AND amount_cents < 0)
    OR (transaction_type = 'income' AND amount_cents > 0)
    OR (transaction_type = 'refund' AND amount_cents > 0)
  ),
  CHECK (destination_account_id IS NULL OR destination_account_id != account_id),
  CHECK (
    (transaction_type = 'expense'
      AND destination_account_id IS NULL
      AND (
        (category_id IS NOT NULL AND special_budget_id IS NULL)
        OR (category_id IS NULL AND special_budget_id IS NOT NULL)
      )
    )
    OR
    (transaction_type = 'transfer'
      AND destination_account_id IS NOT NULL
      AND category_id IS NULL
      AND special_budget_id IS NULL
    )
    OR
    (transaction_type IN ('income', 'refund')
      AND destination_account_id IS NULL
      AND category_id IS NULL
      AND special_budget_id IS NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS imported_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  import_run_id INTEGER NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  account_iban TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  value_date TEXT,
  amount_cents INTEGER NOT NULL,
  counterparty TEXT,
  purpose TEXT,
  end_to_end_reference TEXT,
  mandate_reference TEXT,
  dedupe_fingerprint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_import_fingerprint_unique
ON transactions(import_fingerprint)
WHERE import_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_booking_date
ON transactions(booking_date);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type
ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_special_budget_id
ON transactions(special_budget_id);

CREATE INDEX IF NOT EXISTS idx_monthly_category_budgets_month_key
ON monthly_category_budgets(month_key);

CREATE INDEX IF NOT EXISTS idx_special_budgets_month_key
ON special_budgets(month_key);

INSERT OR IGNORE INTO accounts (name, account_type, currency_code, opening_balance_cents)
VALUES
  ('Sparkasse', 'bank', 'EUR', 0),
  ('Bargeld', 'cash', 'EUR', 0);

INSERT OR IGNORE INTO categories (name, is_default)
VALUES
  ('Einkauf', 1),
  ('Tanken', 1),
  ('Freizeit', 1),
  ('Fitness', 1),
  ('Parkhaus', 1),
  ('Kleidung', 1),
  ('Oeffis', 1);
`;

const fin004MigrationSql = `
ALTER TABLE categories ADD COLUMN icon_name TEXT;
`;

const fin011bMigrationSql = `
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS transactions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  destination_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund')),
  booking_date TEXT NOT NULL,
  value_date TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  description TEXT NOT NULL,
  counterparty_name TEXT,
  counterparty_iban TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'import')),
  import_run_id INTEGER REFERENCES import_runs(id) ON DELETE SET NULL,
  import_fingerprint TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  special_budget_id INTEGER REFERENCES special_budgets(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (transaction_type = 'expense' AND amount_cents < 0)
    OR (transaction_type = 'transfer' AND amount_cents < 0)
    OR (transaction_type = 'income' AND amount_cents > 0)
    OR (transaction_type = 'refund' AND amount_cents > 0)
  ),
  CHECK (destination_account_id IS NULL OR destination_account_id != account_id),
  CHECK (
    (
      transaction_type = 'expense'
      AND destination_account_id IS NULL
      AND (
        (
          source_type = 'manual'
          AND (
            (category_id IS NOT NULL AND special_budget_id IS NULL)
            OR (category_id IS NULL AND special_budget_id IS NOT NULL)
          )
        )
        OR
        (
          source_type = 'import'
          AND category_id IS NULL
          AND special_budget_id IS NULL
        )
      )
    )
    OR
    (
      transaction_type = 'transfer'
      AND destination_account_id IS NOT NULL
      AND category_id IS NULL
      AND special_budget_id IS NULL
    )
    OR
    (
      transaction_type IN ('income', 'refund')
      AND destination_account_id IS NULL
      AND category_id IS NULL
      AND special_budget_id IS NULL
    )
  )
);

INSERT INTO transactions_new (
  id,
  account_id,
  destination_account_id,
  transaction_type,
  booking_date,
  value_date,
  amount_cents,
  currency_code,
  description,
  counterparty_name,
  counterparty_iban,
  source_type,
  import_run_id,
  import_fingerprint,
  category_id,
  special_budget_id,
  created_at,
  updated_at
)
SELECT
  id,
  account_id,
  destination_account_id,
  transaction_type,
  booking_date,
  value_date,
  amount_cents,
  currency_code,
  description,
  counterparty_name,
  counterparty_iban,
  source_type,
  import_run_id,
  import_fingerprint,
  category_id,
  special_budget_id,
  created_at,
  updated_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_import_fingerprint_unique
ON transactions(import_fingerprint)
WHERE import_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_booking_date
ON transactions(booking_date);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type
ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_special_budget_id
ON transactions(special_budget_id);

PRAGMA foreign_keys = ON;
`;

const fin025MigrationSql = `
INSERT INTO app_meta (key, value)
VALUES ('fixed_cost_assignment_mode', 'deprecated')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
`;

const fin030MigrationSql = `
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS transactions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  destination_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund')),
  booking_date TEXT NOT NULL,
  effective_month_key TEXT NOT NULL CHECK (
    length(effective_month_key) = 7
    AND substr(effective_month_key, 5, 1) = '-'
    AND substr(effective_month_key, 1, 4) GLOB '[0-9][0-9][0-9][0-9]'
    AND substr(effective_month_key, 6, 2) BETWEEN '01' AND '12'
  ),
  value_date TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  description TEXT NOT NULL,
  counterparty_name TEXT,
  counterparty_iban TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'import')),
  import_run_id INTEGER REFERENCES import_runs(id) ON DELETE SET NULL,
  import_fingerprint TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  special_budget_id INTEGER REFERENCES special_budgets(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (transaction_type = 'expense' AND amount_cents < 0)
    OR (transaction_type = 'transfer' AND amount_cents < 0)
    OR (transaction_type = 'income' AND amount_cents > 0)
    OR (transaction_type = 'refund' AND amount_cents > 0)
  ),
  CHECK (destination_account_id IS NULL OR destination_account_id != account_id),
  CHECK (
    (
      transaction_type = 'expense'
      AND destination_account_id IS NULL
      AND (
        (
          source_type = 'manual'
          AND (
            (category_id IS NOT NULL AND special_budget_id IS NULL)
            OR (category_id IS NULL AND special_budget_id IS NOT NULL)
          )
        )
        OR
        (
          source_type = 'import'
          AND category_id IS NULL
          AND special_budget_id IS NULL
        )
      )
    )
    OR
    (
      transaction_type = 'transfer'
      AND destination_account_id IS NOT NULL
      AND category_id IS NULL
      AND special_budget_id IS NULL
    )
    OR
    (
      transaction_type IN ('income', 'refund')
      AND destination_account_id IS NULL
      AND category_id IS NULL
      AND special_budget_id IS NULL
    )
  )
);

INSERT INTO transactions_new (
  id,
  account_id,
  destination_account_id,
  transaction_type,
  booking_date,
  effective_month_key,
  value_date,
  amount_cents,
  currency_code,
  description,
  counterparty_name,
  counterparty_iban,
  source_type,
  import_run_id,
  import_fingerprint,
  category_id,
  special_budget_id,
  created_at,
  updated_at
)
SELECT
  id,
  account_id,
  destination_account_id,
  transaction_type,
  booking_date,
  substr(booking_date, 1, 7) AS effective_month_key,
  value_date,
  amount_cents,
  currency_code,
  description,
  counterparty_name,
  counterparty_iban,
  source_type,
  import_run_id,
  import_fingerprint,
  category_id,
  special_budget_id,
  created_at,
  updated_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_import_fingerprint_unique
ON transactions(import_fingerprint)
WHERE import_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_booking_date
ON transactions(booking_date);

CREATE INDEX IF NOT EXISTS idx_transactions_effective_month_key
ON transactions(effective_month_key);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type
ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_special_budget_id
ON transactions(special_budget_id);

PRAGMA foreign_keys = ON;
`;

export const migrations: readonly Migration[] = [
  {
    id: "0001_fin_002",
    name: "FIN-002 initial budgeting domain schema",
    sql: fin002MigrationSql,
  },
  {
    id: "0002_fin_004",
    name: "FIN-004 optional category icon metadata",
    sql: fin004MigrationSql,
  },
  {
    id: "0003_fin_011b",
    name: "FIN-011B allow imported expenses without assignment",
    sql: fin011bMigrationSql,
  },
  {
    id: "0004_fin_025",
    name: "FIN-025 deprecate manual fixed-cost transaction assignment model",
    sql: fin025MigrationSql,
  },
  {
    id: "0005_fin_030",
    name: "FIN-030 add effective month key to transactions and backfill existing rows",
    sql: fin030MigrationSql,
  },
];

type MigrationRow = {
  id: string;
};

function upsertSchemaVersion(db: Database.Database, version: string): void {
  db.prepare(
    `
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  ).run(version);
}

export function getLatestSchemaVersion(): string {
  return migrations.at(-1)?.id ?? "fin-001";
}

export function applyMigrations(db: Database.Database): void {
  db.exec(schemaBootstrapSql);

  const appliedRows = db
    .prepare("SELECT id FROM schema_migrations")
    .all() as MigrationRow[];
  const applied = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    const transaction = db.transaction((pendingMigration: Migration) => {
      db.exec(pendingMigration.sql);
      db.prepare(
        "INSERT OR IGNORE INTO schema_migrations (id, name) VALUES (?, ?)",
      ).run(pendingMigration.id, pendingMigration.name);
      upsertSchemaVersion(db, pendingMigration.id);
    });

    transaction(migration);
  }

  upsertSchemaVersion(db, getLatestSchemaVersion());
}
