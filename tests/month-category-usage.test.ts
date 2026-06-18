import { describe, expect, it } from "vitest";

import {
  categoryUsageChipClassName,
  categoryUsageProgressStyle,
  categoryUsageSurfaceStyle,
  getCategoryUsageState,
} from "@/src/months/category-usage";

describe("FIN-064 category usage colors", () => {
  it("maps usage thresholds to calm state tones", () => {
    expect(
      getCategoryUsageState({ budgetAmountCents: 10000, spentAmountCents: 6900 }),
    ).toMatchObject({ label: "Im Rahmen", percent: 69, progressPercent: 69, tone: "safe" });

    expect(
      getCategoryUsageState({ budgetAmountCents: 10000, spentAmountCents: 7000 }),
    ).toMatchObject({ label: "Beobachten", percent: 70, progressPercent: 70, tone: "watch" });

    expect(
      getCategoryUsageState({ budgetAmountCents: 10000, spentAmountCents: 9000 }),
    ).toMatchObject({ label: "Nahe am Limit", percent: 90, progressPercent: 90, tone: "near" });

    expect(
      getCategoryUsageState({ budgetAmountCents: 10000, spentAmountCents: 10001 }),
    ).toMatchObject({ label: "Über Budget", percent: 100, progressPercent: 100, tone: "over" });

    expect(
      getCategoryUsageState({ budgetAmountCents: 10000, spentAmountCents: 12000 }),
    ).toMatchObject({ label: "Über Budget", percent: 120, progressPercent: 100, tone: "over" });
  });

  it("handles missing or zero budgets defensively", () => {
    expect(
      getCategoryUsageState({ budgetAmountCents: null, spentAmountCents: 3000 }),
    ).toMatchObject({ label: "Budget fehlt", percent: 0, progressPercent: 0, tone: "missing" });

    expect(
      getCategoryUsageState({ budgetAmountCents: 0, spentAmountCents: 3000 }),
    ).toMatchObject({ label: "Budget fehlt", percent: 0, progressPercent: 0, tone: "missing" });
  });

  it("provides consistent chip, surface and progress styles", () => {
    const state = getCategoryUsageState({ budgetAmountCents: 10000, spentAmountCents: 9500 });

    expect(categoryUsageChipClassName(state)).toContain("orange");
    expect(categoryUsageProgressStyle(state)).toMatchObject({
      background: expect.stringContaining("#FB923C"),
    });
    expect(categoryUsageSurfaceStyle(state)).toMatchObject({
      backgroundColor: expect.stringContaining("255, 247, 237"),
    });
  });
});
