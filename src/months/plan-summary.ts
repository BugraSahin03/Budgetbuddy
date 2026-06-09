export type BudgetPotCategoryInput = {
  budgetAmountCents: number | null;
};

export type BudgetPotSpecialBudgetInput = {
  plannedAmountCents: number;
  isActive: boolean;
};

export type MonthPlanSummary = {
  plannedCategoryBudgetCents: number;
  plannedSpecialBudgetCents: number;
  plannedBudgetPotCents: number;
  planRestAfterBudgetPotsCents: number;
};

function positiveAmountOrZero(amountCents: number | null): number {
  if (amountCents === null || amountCents <= 0) {
    return 0;
  }

  return amountCents;
}

export function buildMonthPlanSummary({
  incomeCents,
  categoryRows,
  specialBudgetRows,
}: {
  incomeCents: number;
  categoryRows: BudgetPotCategoryInput[];
  specialBudgetRows: BudgetPotSpecialBudgetInput[];
}): MonthPlanSummary {
  const plannedCategoryBudgetCents = categoryRows.reduce(
    (sum, row) => sum + positiveAmountOrZero(row.budgetAmountCents),
    0,
  );
  const plannedSpecialBudgetCents = specialBudgetRows.reduce(
    (sum, row) =>
      row.isActive ? sum + positiveAmountOrZero(row.plannedAmountCents) : sum,
    0,
  );
  const plannedBudgetPotCents =
    plannedCategoryBudgetCents + plannedSpecialBudgetCents;

  return {
    plannedCategoryBudgetCents,
    plannedSpecialBudgetCents,
    plannedBudgetPotCents,
    planRestAfterBudgetPotsCents: incomeCents - plannedBudgetPotCents,
  };
}
