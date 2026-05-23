import { describe, expect, it } from "vitest";

import {
  buildDashboardKpis,
  categoryStatusLabel,
  countOverBudgetWarnings,
  specialBudgetStatusLabel,
} from "@/src/dashboard/ui";

describe("dashboard ui adapters", () => {
  it("classifies category and special budget status labels", () => {
    expect(
      categoryStatusLabel({
        categoryId: 1,
        categoryName: "Einkauf",
        isCategoryActive: true,
        budgetAmountCents: null,
        spentAmountCents: 0,
        remainingAmountCents: null,
      }),
    ).toBe("Budget fehlt");

    expect(
      categoryStatusLabel({
        categoryId: 1,
        categoryName: "Freizeit",
        isCategoryActive: true,
        budgetAmountCents: 1000,
        spentAmountCents: 1500,
        remainingAmountCents: -500,
      }),
    ).toBe("Ueber Budget");

    expect(
      specialBudgetStatusLabel({
        id: 1,
        name: "Bali",
        monthKey: "2026-05",
        plannedAmountCents: 10000,
        actualExpenseCents: 9500,
        remainingAmountCents: 500,
        isActive: true,
      }),
    ).toBe("Nahe am Budget");
  });

  it("builds KPI cards and warning counter from snapshot", () => {
    const snapshot = {
      totals: {
        monthKey: "2026-05",
        incomeCents: 200000,
        expenseCents: 120000,
        plannedFixedCostsCents: 50000,
        actualFixedCostsCents: 42000,
        availableCents: 30000,
        cashBalanceCents: 15000,
      },
      categoryRows: [
        {
          categoryId: 1,
          categoryName: "Einkauf",
          isCategoryActive: true,
          budgetAmountCents: 60000,
          spentAmountCents: 61000,
          remainingAmountCents: -1000,
        },
      ],
      specialBudgetRows: [
        {
          id: 1,
          name: "Raspberry Pi",
          monthKey: "2026-05",
          plannedAmountCents: 10000,
          actualExpenseCents: 12000,
          remainingAmountCents: -2000,
          isActive: true,
        },
      ],
    };

    const kpis = buildDashboardKpis(snapshot);
    expect(kpis.some((card) => card.label === "Einnahmen")).toBe(true);
    expect(kpis.some((card) => card.label === "Bargeldbestand")).toBe(true);

    expect(countOverBudgetWarnings(snapshot)).toBe(2);
  });
});
