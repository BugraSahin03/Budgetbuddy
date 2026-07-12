import "server-only";

import { getDb } from "@/src/db/client";
import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";

export type IncomeDeductionMatchField = "description" | "counterparty" | "combined";

export type IncomeDeductionRule = {
  id: number;
  name: string;
  pattern: string;
  matchField: IncomeDeductionMatchField;
  isActive: boolean;
  priority: number;
};

export type IncomeDeductionRuleInput = Omit<IncomeDeductionRule, "id">;

function normalizeInput(input: IncomeDeductionRuleInput): IncomeDeductionRuleInput {
  const name = input.name.trim();
  const pattern = input.pattern.trim();

  if (name.length < 2 || name.length > 80) {
    throw new Error("Regelname muss 2 bis 80 Zeichen lang sein.");
  }

  if (pattern.length < 2 || pattern.length > 120) {
    throw new Error("Suchmuster muss 2 bis 120 Zeichen lang sein.");
  }

  if (!["description", "counterparty", "combined"].includes(input.matchField)) {
    throw new Error("Suchfeld ist ungültig.");
  }

  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 999) {
    throw new Error("Priorität muss zwischen 1 und 999 liegen.");
  }

  return { ...input, name, pattern };
}

function mapRule(row: Omit<IncomeDeductionRule, "isActive"> & { isActive: number }): IncomeDeductionRule {
  return { ...row, isActive: row.isActive === 1 };
}

export function listIncomeDeductionRules(): IncomeDeductionRule[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          id,
          name,
          pattern,
          match_field AS matchField,
          is_active AS isActive,
          priority
        FROM income_deduction_rules
        ORDER BY is_active DESC, priority ASC, id ASC
      `,
    )
    .all() as Array<Omit<IncomeDeductionRule, "isActive"> & { isActive: number }>;

  return rows.map(mapRule);
}

export function listActiveIncomeDeductionRules(): IncomeDeductionRule[] {
  return listIncomeDeductionRules().filter((rule) => rule.isActive);
}

export function createIncomeDeductionRule(input: IncomeDeductionRuleInput): void {
  const normalized = normalizeInput(input);

  getDb()
    .prepare(
      `
        INSERT INTO income_deduction_rules (
          name,
          pattern,
          match_field,
          is_active,
          priority,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .run(
      normalized.name,
      normalized.pattern,
      normalized.matchField,
      normalized.isActive ? 1 : 0,
      normalized.priority,
    );
}

export function updateIncomeDeductionRule(
  ruleId: number,
  input: IncomeDeductionRuleInput,
): void {
  const normalized = normalizeInput(input);
  const result = getDb()
    .prepare(
      `
        UPDATE income_deduction_rules
        SET
          name = ?,
          pattern = ?,
          match_field = ?,
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
      normalized.isActive ? 1 : 0,
      normalized.priority,
      ruleId,
    );

  if (result.changes === 0) {
    throw new Error("Einkommensabzugsregel wurde nicht gefunden.");
  }
}

export function deleteIncomeDeductionRule(ruleId: number): void {
  const result = getDb()
    .prepare("DELETE FROM income_deduction_rules WHERE id = ?")
    .run(ruleId);

  if (result.changes === 0) {
    throw new Error("Einkommensabzugsregel wurde nicht gefunden.");
  }
}

export function parseIncomeDeductionRuleInput(
  formData: FormData,
): IncomeDeductionRuleInput {
  const priority = Number.parseInt(String(formData.get("priority") ?? "100"), 10);

  return normalizeInput({
    name: String(formData.get("name") ?? ""),
    pattern: String(formData.get("pattern") ?? ""),
    matchField: String(
      formData.get("matchField") ?? "combined",
    ) as IncomeDeductionMatchField,
    isActive: String(formData.get("isActive") ?? "off") === "on",
    priority,
  });
}

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

function getMatchText(row: SparkasseCsvRow, field: IncomeDeductionMatchField): string {
  if (field === "description") return normalize(row.description);
  if (field === "counterparty") return normalize(row.counterparty);
  return normalize(`${row.description} ${row.counterparty}`);
}

export function matchIncomeDeductionRule(
  row: SparkasseCsvRow,
  rules: IncomeDeductionRule[],
): IncomeDeductionRule | null {
  if (row.amountCents >= 0) return null;

  for (const rule of rules.filter((candidate) => candidate.isActive)) {
    const needle = normalize(rule.pattern);
    if (needle.length > 0 && getMatchText(row, rule.matchField).includes(needle)) {
      return rule;
    }
  }

  return null;
}

export function hasIncomeDeductionForMonth(monthKey: string): boolean {
  const row = getDb()
    .prepare(
      `
        SELECT id
        FROM transactions
        WHERE effective_month_key = ?
          AND transaction_type = 'income_deduction'
        LIMIT 1
      `,
    )
    .get(monthKey);

  return Boolean(row);
}
