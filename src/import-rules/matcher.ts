import "server-only";

import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";
import type { ImportRule } from "@/src/import-rules/repository";

export type ImportRuleSuggestion = {
  rowIndex: number;
  label: string;
  ruleName: string;
};

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

function getMatchText(row: SparkasseCsvRow, matchField: ImportRule["matchField"]): string {
  if (matchField === "description") {
    return normalize(row.description);
  }

  if (matchField === "counterparty") {
    return normalize(row.counterparty);
  }

  return normalize(`${row.description} ${row.counterparty}`);
}

function suggestionLabel(rule: ImportRule): string {
  if (rule.targetType === "transfer_cash") {
    if (rule.name === "N26 Transfer-Kandidat") {
      return "Transfer-Kandidat -> N26";
    }

    return "Transfer -> Bargeld";
  }

  if (rule.targetType === "category") {
    return `Kategorie-ID ${rule.categoryId}`;
  }

  return `Sonderbudget-ID ${rule.specialBudgetId}`;
}

export function buildImportRuleSuggestions(params: {
  rows: SparkasseCsvRow[];
  rules: ImportRule[];
}): ImportRuleSuggestion[] {
  const activeRules = params.rules.filter((rule) => rule.isActive);
  const suggestions: ImportRuleSuggestion[] = [];

  for (let rowIndex = 0; rowIndex < params.rows.length; rowIndex += 1) {
    const row = params.rows[rowIndex];

    for (const rule of activeRules) {
      const haystack = getMatchText(row, rule.matchField);
      const needle = normalize(rule.pattern);

      if (needle.length === 0) {
        continue;
      }

      if (haystack.includes(needle)) {
        suggestions.push({
          rowIndex,
          label: suggestionLabel(rule),
          ruleName: rule.name,
        });
        break;
      }
    }
  }

  return suggestions;
}
