import type { DashboardMonthSnapshot } from "@/src/dashboard/repository";
import type { MonthlyBudgetCategoryRow } from "@/src/budgets/repository";
import type { DashboardSpecialBudgetRow } from "@/src/dashboard/repository";

export type DashboardKpiCard = {
  label: string;
  value: string;
  tone: string;
};

type BudgetWarningSnapshot = {
  categoryRows: MonthlyBudgetCategoryRow[];
  specialBudgetRows: DashboardSpecialBudgetRow[];
};

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function categoryStatusLabel(row: MonthlyBudgetCategoryRow): string {
  if (row.budgetAmountCents === null) {
    return "Budget fehlt";
  }

  if (row.remainingAmountCents !== null && row.remainingAmountCents < 0) {
    return "Ueber Budget";
  }

  if (row.remainingAmountCents !== null && row.remainingAmountCents <= 1000) {
    return "Nahe am Budget";
  }

  return "Im Rahmen";
}

export function categoryStatusTone(row: MonthlyBudgetCategoryRow): string {
  const label = categoryStatusLabel(row);

  if (label === "Ueber Budget") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (label === "Nahe am Budget") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (label === "Budget fehlt") {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function specialBudgetStatusLabel(row: DashboardSpecialBudgetRow): string {
  if (row.remainingAmountCents < 0) {
    return "Ueber Budget";
  }

  if (row.remainingAmountCents <= 1000) {
    return "Nahe am Budget";
  }

  return "Im Rahmen";
}

export function specialBudgetStatusTone(row: DashboardSpecialBudgetRow): string {
  const label = specialBudgetStatusLabel(row);

  if (label === "Ueber Budget") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (label === "Nahe am Budget") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function buildDashboardKpis(snapshot: DashboardMonthSnapshot): DashboardKpiCard[] {
  return [
    {
      label: "Einnahmen",
      value: formatEuro(snapshot.totals.incomeCents),
      tone: "text-emerald-700",
    },
    {
      label: "Ausgaben",
      value: formatEuro(snapshot.totals.expenseCents),
      tone: "text-rose-700",
    },
    {
      label: "Gespart",
      value: formatEuro(snapshot.totals.savingsCents),
      tone: "text-sky-700",
    },
  ];
}

export function countOverBudgetWarnings(snapshot: BudgetWarningSnapshot): number {
  const categoryWarnings = snapshot.categoryRows.filter(
    (row) => categoryStatusLabel(row) === "Ueber Budget",
  ).length;

  const specialBudgetWarnings = snapshot.specialBudgetRows.filter(
    (row) => specialBudgetStatusLabel(row) === "Ueber Budget",
  ).length;

  return categoryWarnings + specialBudgetWarnings;
}
