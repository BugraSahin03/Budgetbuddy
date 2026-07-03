import type { ImportRule } from "@/src/import-rules/repository";

export function isN26FixedCostControlRule(rule: ImportRule): boolean {
  return rule.targetType === "transfer_cash" && rule.rulePurpose === "fixed_cost_control";
}

export function isCashTransferRule(rule: ImportRule): boolean {
  return rule.targetType === "transfer_cash" && rule.rulePurpose === "cash_transfer";
}
