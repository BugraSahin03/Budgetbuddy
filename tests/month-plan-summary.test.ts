import { describe, expect, it } from "vitest";

import { buildMonthPlanSummary } from "@/src/months/plan-summary";

describe("FIN-066 month budget pot plan summary", () => {
  it("sums effective category budgets and active special budgets", () => {
    const summary = buildMonthPlanSummary({
      incomeCents: 250000,
      categoryRows: [
        { budgetAmountCents: 22000 },
        { budgetAmountCents: 17500 },
        { budgetAmountCents: null },
      ],
      specialBudgetRows: [
        { plannedAmountCents: 40000, isActive: true },
        { plannedAmountCents: 9000, isActive: false },
      ],
    });

    expect(summary).toEqual({
      plannedCategoryBudgetCents: 39500,
      plannedSpecialBudgetCents: 40000,
      plannedBudgetPotCents: 79500,
      planRestAfterBudgetPotsCents: 170500,
    });
  });

  it("treats missing, zero and negative plan values defensively", () => {
    const summary = buildMonthPlanSummary({
      incomeCents: 10000,
      categoryRows: [
        { budgetAmountCents: null },
        { budgetAmountCents: 0 },
        { budgetAmountCents: -500 },
      ],
      specialBudgetRows: [
        { plannedAmountCents: 0, isActive: true },
        { plannedAmountCents: -1500, isActive: true },
      ],
    });

    expect(summary.plannedBudgetPotCents).toBe(0);
    expect(summary.planRestAfterBudgetPotsCents).toBe(10000);
  });
});
