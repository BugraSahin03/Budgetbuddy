import "server-only";

import { getDb } from "@/src/db/client";

export type ImportRuleMatchField = "description" | "counterparty" | "combined";
export type ImportRuleTargetType = "category" | "special_budget" | "transfer_cash";

export type ImportRule = {
  id: number;
  name: string;
  pattern: string;
  matchField: ImportRuleMatchField;
  targetType: ImportRuleTargetType;
  categoryId: number | null;
  specialBudgetId: number | null;
  isActive: boolean;
  priority: number;
};

export type ImportRuleInput = {
  name: string;
  pattern: string;
  matchField: ImportRuleMatchField;
  targetType: ImportRuleTargetType;
  categoryId: number | null;
  specialBudgetId: number | null;
  isActive: boolean;
  priority: number;
};

function ensureImportRulesTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS import_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      match_field TEXT NOT NULL CHECK (match_field IN ('description', 'counterparty', 'combined')),
      target_type TEXT NOT NULL CHECK (target_type IN ('category', 'special_budget', 'transfer_cash')),
      category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
      special_budget_id INTEGER REFERENCES special_budgets(id) ON DELETE RESTRICT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      priority INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_import_rules_active_priority
      ON import_rules(is_active, priority, id);
  `);

  // FIN-023 default: editable N26 transfer candidate pattern.
  // Seed must run at most once and must respect user edits/deactivation.
  const seedState = getDb()
    .prepare(
      `
        SELECT value
        FROM app_meta
        WHERE key = 'import_rule_seed_n26_transfer_candidate_v1'
        LIMIT 1
      `,
    )
    .get() as { value?: string } | undefined;

  if (seedState?.value === "1") {
    return;
  }

  const existingDefault = getDb()
    .prepare(
      `
        SELECT id
        FROM import_rules
        WHERE name = 'N26 Transfer-Kandidat'
        LIMIT 1
      `,
    )
    .get() as { id: number } | undefined;

  if (!existingDefault) {
    getDb()
      .prepare(
        `
          INSERT INTO import_rules (
            name,
            pattern,
            match_field,
            target_type,
            category_id,
            special_budget_id,
            is_active,
            priority,
            updated_at
          )
          VALUES ('N26 Transfer-Kandidat', 'N26-Fix.', 'description', 'transfer_cash', NULL, NULL, 1, 60, CURRENT_TIMESTAMP)
        `,
      )
      .run();
  }

  getDb()
    .prepare(
      `
        INSERT INTO app_meta (key, value)
        VALUES ('import_rule_seed_n26_transfer_candidate_v1', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
    )
    .run();
}

function toNullablePositiveInt(raw: string): number | null {
  const normalized = raw.trim();
  if (normalized.length === 0) {
    return null;
  }

  const value = Number.parseInt(normalized, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("ID-Wert ist ungueltig.");
  }

  return value;
}

function normalizeInput(input: ImportRuleInput): ImportRuleInput {
  const name = input.name.trim();
  const pattern = input.pattern.trim();

  if (name.length < 2 || name.length > 80) {
    throw new Error("Regelname muss 2 bis 80 Zeichen lang sein.");
  }

  if (pattern.length < 2 || pattern.length > 120) {
    throw new Error("Suchmuster muss 2 bis 120 Zeichen lang sein.");
  }

  if (input.targetType === "category") {
    if (!input.categoryId) {
      throw new Error("Kategorie-Regel braucht eine Kategorie.");
    }

    return {
      ...input,
      name,
      pattern,
      specialBudgetId: null,
    };
  }

  if (input.targetType === "special_budget") {
    if (!input.specialBudgetId) {
      throw new Error("Sonderbudget-Regel braucht ein Sonderbudget.");
    }

    return {
      ...input,
      name,
      pattern,
      categoryId: null,
    };
  }

  return {
    ...input,
    name,
    pattern,
    categoryId: null,
    specialBudgetId: null,
  };
}

export function listImportRules(): ImportRule[] {
  ensureImportRulesTable();

  const rows = getDb()
    .prepare(
      `
        SELECT
          id,
          name,
          pattern,
          match_field AS matchField,
          target_type AS targetType,
          category_id AS categoryId,
          special_budget_id AS specialBudgetId,
          is_active AS isActive,
          priority
        FROM import_rules
        ORDER BY is_active DESC, priority ASC, id ASC
      `,
    )
    .all() as Array<{
    id: number;
    name: string;
    pattern: string;
    matchField: ImportRuleMatchField;
    targetType: ImportRuleTargetType;
    categoryId: number | null;
    specialBudgetId: number | null;
    isActive: number;
    priority: number;
  }>;

  return rows.map((row) => ({
    ...row,
    isActive: row.isActive === 1,
  }));
}

export function listActiveImportRules(): ImportRule[] {
  return listImportRules().filter((rule) => rule.isActive);
}

export function createImportRule(input: ImportRuleInput): void {
  ensureImportRulesTable();
  const normalized = normalizeInput(input);

  getDb()
    .prepare(
      `
        INSERT INTO import_rules (
          name,
          pattern,
          match_field,
          target_type,
          category_id,
          special_budget_id,
          is_active,
          priority,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .run(
      normalized.name,
      normalized.pattern,
      normalized.matchField,
      normalized.targetType,
      normalized.categoryId,
      normalized.specialBudgetId,
      normalized.isActive ? 1 : 0,
      normalized.priority,
    );
}

export function updateImportRule(ruleId: number, input: ImportRuleInput): void {
  ensureImportRulesTable();
  const normalized = normalizeInput(input);

  const result = getDb()
    .prepare(
      `
        UPDATE import_rules
        SET
          name = ?,
          pattern = ?,
          match_field = ?,
          target_type = ?,
          category_id = ?,
          special_budget_id = ?,
          is_active = ?,
          priority = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(
      normalized.name,
      normalized.pattern,
      normalized.matchField,
      normalized.targetType,
      normalized.categoryId,
      normalized.specialBudgetId,
      normalized.isActive ? 1 : 0,
      normalized.priority,
      ruleId,
    );

  if (result.changes === 0) {
    throw new Error("Regel wurde nicht gefunden.");
  }
}

export function parseRuleInputFromFormData(formData: FormData): ImportRuleInput {
  const matchField = String(formData.get("matchField") ?? "combined") as ImportRuleMatchField;
  const targetType = String(formData.get("targetType") ?? "category") as ImportRuleTargetType;

  return {
    name: String(formData.get("name") ?? ""),
    pattern: String(formData.get("pattern") ?? ""),
    matchField,
    targetType,
    categoryId: toNullablePositiveInt(String(formData.get("categoryId") ?? "")),
    specialBudgetId: toNullablePositiveInt(String(formData.get("specialBudgetId") ?? "")),
    isActive: String(formData.get("isActive") ?? "off") === "on",
    priority: Number.parseInt(String(formData.get("priority") ?? "100"), 10) || 100,
  };
}
