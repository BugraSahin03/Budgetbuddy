import { describe, expect, it } from "vitest";

import { buildDashboardKpis } from "@/src/dashboard/ui";

describe("dashboard ui adapters", () => {
  it("builds exactly the three dashboard KPI cards", () => {
    const snapshot = {
      totals: {
        monthKey: "2026-05",
        incomeCents: 200000,
        grossIncomeCents: 200000,
        incomeDeductionCents: 0,
        expenseCents: 120000,
        savingsCents: 25000,
        plannedFixedCostsCents: 50000,
        actualFixedCostsCents: 42000,
        currentBudgetCents: 38000,
        projectedAfterFixedCostsCents: 30000,
        cashBalanceCents: 15000,
      },
      categoryRows: [],
      specialBudgetRows: [],
      openAssignmentCount: 0,
      recentTransactions: [],
    };

    const kpis = buildDashboardKpis(snapshot);

    expect(kpis.map((card) => card.label)).toEqual(["Einnahmen", "Ausgaben", "Gespart"]);
    expect(kpis.map((card) => card.value)).toEqual(["2.000,00 €", "1.200,00 €", "250,00 €"]);
    expect(kpis.map((card) => card.tone)).toEqual([
      "text-[#08766b]",
      "text-[#f17680]",
      "text-[#4f7d12]",
    ]);
  });
});
