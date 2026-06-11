import "server-only";

import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";
import type { ImportRule } from "@/src/import-rules/repository";

type FixedCostForImportMatching = {
  name: string;
  plannedAmountCents: number;
  paymentNote: string | null;
  isActive: boolean;
};

const N26_CONTROL_RULE_NAMES = new Set([
  "N26 Sammeltransfer Kontrolle",
  "N26 Transfer-Kandidat",
]);
const N26_CONTROL_PATTERN = "N26-FIX.";

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

function isN26ControlRule(rule: ImportRule): boolean {
  if (rule.targetType !== "transfer_cash") {
    return false;
  }

  return (
    N26_CONTROL_RULE_NAMES.has(rule.name) ||
    normalize(rule.pattern).includes(N26_CONTROL_PATTERN)
  );
}

function suggestionLabel(rule: ImportRule): string {
  if (rule.targetType === "transfer_cash") {
    if (isN26ControlRule(rule)) {
      return "Fixkosten-Kontrolle: N26-Sammeltransfer";
    }

    return "Transfer -> Bargeld";
  }

  if (rule.targetType === "category") {
    return `Kategorie-ID ${rule.categoryId}`;
  }

  return `Sonderkategorie-ID ${rule.specialBudgetId}`;
}

function normalizeToken(value: string | null): string {
  return normalize(value ?? "").replace(/[^A-Z0-9]+/g, " ").trim();
}

function tokenFromFixedCost(fixedCost: FixedCostForImportMatching): string {
  const paymentNote = normalizeToken(fixedCost.paymentNote);
  if (paymentNote.length >= 3) {
    return paymentNote;
  }

  return normalizeToken(fixedCost.name);
}

function buildDirectFixedCostSuggestion(
  row: SparkasseCsvRow,
  fixedCosts: FixedCostForImportMatching[],
): Omit<ImportRuleSuggestion, "rowIndex"> | null {
  if (row.amountCents >= 0) {
    return null;
  }

  const haystack = normalizeToken(`${row.description} ${row.counterparty}`);
  const absoluteAmount = Math.abs(row.amountCents);

  for (const fixedCost of fixedCosts) {
    if (!fixedCost.isActive) {
      continue;
    }

    if (fixedCost.plannedAmountCents !== absoluteAmount) {
      continue;
    }

    const token = tokenFromFixedCost(fixedCost);
    if (token.length < 3) {
      continue;
    }

    if (haystack.includes(token)) {
      return {
        label: `Fixkosten-Kontrolle: Direktabbuchung (${fixedCost.name})`,
        ruleName: "Fixkosten-Matching (Direktabbuchung)",
      };
    }
  }

  return null;
}

export function buildImportRuleSuggestions(params: {
  rows: SparkasseCsvRow[];
  rules: ImportRule[];
  fixedCosts?: FixedCostForImportMatching[];
}): ImportRuleSuggestion[] {
  const activeRules = params.rules.filter((rule) => rule.isActive);
  const fixedCosts = params.fixedCosts ?? [];
  const suggestions: ImportRuleSuggestion[] = [];

  for (let rowIndex = 0; rowIndex < params.rows.length; rowIndex += 1) {
    const row = params.rows[rowIndex];
    let ruleMatched = false;

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
        ruleMatched = true;
        break;
      }
    }

    if (ruleMatched) {
      continue;
    }

    const directFixedCostSuggestion = buildDirectFixedCostSuggestion(row, fixedCosts);
    if (directFixedCostSuggestion) {
      suggestions.push({
        rowIndex,
        ...directFixedCostSuggestion,
      });
    }
  }

  return suggestions;
}
