import { describe, expect, it } from "vitest";

import {
  categoryUsageChipClassName,
  categoryUsageProgressStyle,
  categoryUsageSurfaceStyle,
  getCategoryPlanScale,
  getCategoryUsageState,
  getHighestPlannedAmountCents,
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

  it("scales positive category and special-budget plans against one shared maximum", () => {
    const highestPlannedAmountCents = getHighestPlannedAmountCents([
      2000,
      40000,
      null,
      0,
    ]);

    expect(highestPlannedAmountCents).toBe(40000);
    expect(
      getCategoryPlanScale({
        budgetAmountCents: 40000,
        highestPlannedAmountCents,
      }),
    ).toEqual({ hasPlannedBudget: true, scalePercent: 100 });
    expect(
      getCategoryPlanScale({
        budgetAmountCents: 20000,
        highestPlannedAmountCents,
      }),
    ).toEqual({ hasPlannedBudget: true, scalePercent: 50 });
  });

  it("keeps small plans visible without allowing missing plans to distort the scale", () => {
    expect(
      getCategoryPlanScale({
        budgetAmountCents: 2000,
        highestPlannedAmountCents: 40000,
      }),
    ).toEqual({ hasPlannedBudget: true, scalePercent: 12 });
    expect(
      getCategoryPlanScale({
        budgetAmountCents: 0,
        highestPlannedAmountCents: 40000,
      }),
    ).toEqual({ hasPlannedBudget: false, scalePercent: 0 });
    expect(
      getCategoryPlanScale({
        budgetAmountCents: null,
        highestPlannedAmountCents: 0,
      }),
    ).toEqual({ hasPlannedBudget: false, scalePercent: 0 });
  });

  it("uses the full scale when only one positive planned amount exists", () => {
    const highestPlannedAmountCents = getHighestPlannedAmountCents([
      null,
      0,
      12500,
    ]);

    expect(
      getCategoryPlanScale({
        budgetAmountCents: 12500,
        highestPlannedAmountCents,
      }),
    ).toEqual({ hasPlannedBudget: true, scalePercent: 100 });
  });
});
