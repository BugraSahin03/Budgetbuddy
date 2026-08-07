import "server-only";

import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";
import { isN26FixedCostControlRule } from "@/src/import-rules/classification";
import {
  matchIncomeDeductionRule,
  type IncomeDeductionRule,
} from "@/src/import-rules/income-deductions";
import type { ImportRule } from "@/src/import-rules/repository";

export type ImportRuleSuggestion = {
  rowIndex: number;
  label: string;
  ruleName: string;
  kind?: "standard" | "fixed_cost_control" | "income_deduction";
  ruleId?: number;
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
    if (isN26FixedCostControlRule(rule)) {
      return "Fixkosten-Kontrolle: Kontrollmuster";
    }

    return "Transfer -> Bargeld";
  }

  if (rule.targetType === "category") {
    return `Kategorie-ID ${rule.categoryId}`;
  }

  return `Sonderkategorie-ID ${rule.specialBudgetId}`;
}

export function buildImportRuleSuggestions(params: {
  rows: SparkasseCsvRow[];
  rules: ImportRule[];
  incomeDeductionRules?: IncomeDeductionRule[];
}): ImportRuleSuggestion[] {
  const activeRules = params.rules.filter((rule) => rule.isActive);
  const suggestions: ImportRuleSuggestion[] = [];

  for (let rowIndex = 0; rowIndex < params.rows.length; rowIndex += 1) {
    const row = params.rows[rowIndex];
    const incomeDeductionRule = matchIncomeDeductionRule(
      row,
      params.incomeDeductionRules ?? [],
    );

    if (incomeDeductionRule) {
      suggestions.push({
        rowIndex,
        label: "Einkommensabzug",
        ruleName: incomeDeductionRule.name,
        kind: "income_deduction",
      });
      continue;
    }

    let ruleMatched = false;

    for (const rule of activeRules) {
      const isFixedCostControlRule = isN26FixedCostControlRule(rule);
      if (isFixedCostControlRule && row.amountCents >= 0) {
        continue;
      }

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
          kind: isFixedCostControlRule ? "fixed_cost_control" : "standard",
          ruleId: rule.id,
        });
        ruleMatched = true;
        break;
      }
    }

    if (ruleMatched) {
      continue;
    }
  }

  return suggestions;
}
