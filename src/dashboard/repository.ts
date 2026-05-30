import "server-only";

import {
  getMonthSnapshot,
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
};

export function getDashboardMonthSnapshot(monthKey: string): DashboardMonthSnapshot {
  const snapshot: MonthSnapshot = getMonthSnapshot(monthKey);

  return {
    totals: snapshot.totals,
    categoryRows: snapshot.categoryRows,
    specialBudgetRows: snapshot.specialBudgetRows,
  };
}
