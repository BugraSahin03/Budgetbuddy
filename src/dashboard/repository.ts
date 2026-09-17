import "server-only";

import {
  getMonthSnapshot,
  type MonthDetailTransactionRow,
  type MonthSnapshot,
  type MonthSpecialBudgetRow,
  type MonthTotals,
} from "@/src/months/repository";
import type { MonthlyBudgetCategoryRow } from "@/src/budgets/repository";

export type DashboardTotals = MonthTotals;
export type DashboardSpecialBudgetRow = MonthSpecialBudgetRow;

export type DashboardMonthSnapshot = {
  totals: DashboardTotals;
  categoryRows: MonthlyBudgetCategoryRow[];
  specialBudgetRows: DashboardSpecialBudgetRow[];
  openAssignmentCount: number;
  recentTransactions: MonthDetailTransactionRow[];
};

function needsAssignment(transaction: MonthDetailTransactionRow): boolean {
  return (
    transaction.settlementGroupId === null &&
    transaction.transactionType === "expense" &&
    transaction.categoryId === null &&
    transaction.specialBudgetId === null
  );
}

export function getDashboardMonthSnapshot(monthKey: string): DashboardMonthSnapshot {
  const snapshot: MonthSnapshot = getMonthSnapshot(monthKey);

  return {
    totals: snapshot.totals,
    categoryRows: snapshot.categoryRows,
    specialBudgetRows: snapshot.specialBudgetRows,
    openAssignmentCount:
      snapshot.transactions.filter(needsAssignment).length +
      snapshot.settlementGroups.filter(
        (group) =>
          group.amountCents < 0 &&
          group.categoryId === null &&
          group.specialBudgetId === null,
      ).length,
    recentTransactions: snapshot.transactions.slice(0, 5),
  };
}
