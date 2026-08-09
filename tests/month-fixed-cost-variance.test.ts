import { describe, expect, it } from "vitest";

import { getFixedCostVariance } from "@/src/months/fixed-cost-variance";

describe("fixed-cost plan/actual variance", () => {
  it("shows a calm open amount when actual is below plan", () => {
    expect(getFixedCostVariance(232431, 156490)).toEqual({
      state: "under-plan",
      amountCents: 75941,
      label: "Noch nicht als Fixkosten gebucht",
    });
  });

  it("confirms when plan and actual match", () => {
    expect(getFixedCostVariance(156490, 156490)).toEqual({
      state: "on-plan",
      amountCents: 0,
      label: "Plan und Ist stimmen überein",
    });
  });

  it("warns with the overage when actual exceeds plan", () => {
    expect(getFixedCostVariance(150000, 156490)).toEqual({
      state: "over-plan",
      amountCents: 6490,
      label: "Fixkosten-Ist liegt über Plan",
    });
  });
});
