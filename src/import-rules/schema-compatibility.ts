import type Database from "better-sqlite3";

export const N26_CONTROL_RULE_NAME = "N26 Sammeltransfer Kontrolle";
export const LEGACY_N26_CONTROL_RULE_NAME = "N26 Transfer-Kandidat";
export const N26_CONTROL_PATTERN = "N26-Fix.";

export function ensureImportRulePurposeCompatibility(
  db: Database.Database,
): void {
  const columns = db
    .prepare("PRAGMA table_info(import_rules)")
    .all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "rule_purpose")) {
    db.exec(`
      ALTER TABLE import_rules
      ADD COLUMN rule_purpose TEXT NOT NULL DEFAULT 'cash_transfer'
        CHECK (rule_purpose IN ('assignment', 'fixed_cost_control', 'cash_transfer'));
    `);
  }

  db.prepare(
    `
      UPDATE import_rules
      SET rule_purpose = 'assignment'
      WHERE target_type IN ('category', 'special_budget')
    `,
  ).run();

  db.prepare(
    `
      UPDATE import_rules
      SET rule_purpose = 'fixed_cost_control'
      WHERE target_type = 'transfer_cash'
        AND (
          name IN (?, ?)
          OR UPPER(name) LIKE '%N26%KONTROLLE%'
          OR UPPER(name) LIKE '%N26%TRANSFER%'
          OR UPPER(pattern) LIKE '%N26-FIX.%'
        )
    `,
  ).run(N26_CONTROL_RULE_NAME, LEGACY_N26_CONTROL_RULE_NAME);
}
