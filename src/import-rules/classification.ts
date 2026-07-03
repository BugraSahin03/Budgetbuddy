import type { ImportRule } from "@/src/import-rules/repository";

const N26_CONTROL_RULE_NAMES = new Set([
  "N26 Sammeltransfer Kontrolle",
  "N26 Transfer-Kandidat",
]);
const N26_CONTROL_PATTERN = "N26-FIX.";

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

export function isN26FixedCostControlRule(rule: ImportRule): boolean {
  if (rule.targetType !== "transfer_cash") {
    return false;
  }

  return (
    N26_CONTROL_RULE_NAMES.has(rule.name) ||
    normalize(rule.pattern).includes(N26_CONTROL_PATTERN)
  );
}

export function isCashTransferRule(rule: ImportRule): boolean {
  return rule.targetType === "transfer_cash" && !isN26FixedCostControlRule(rule);
}
