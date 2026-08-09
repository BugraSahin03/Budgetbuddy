import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

// The production monitor is plain ESM so it can run without a build step.
// @ts-expect-error The deployment module intentionally has no TypeScript declarations.
import {
  compareSignalState,
  evaluateSignals,
} from "../alfred/stage5/monitor/monitor.mjs";

function withIntegrity<T extends Record<string, unknown>>(snapshot: T) {
  const hashInput = { ...snapshot, capturedAt: undefined };
  return {
    ...snapshot,
    integrity: {
      algorithm: "sha256",
      dataSha256: createHash("sha256").update(JSON.stringify(hashInput)).digest("hex"),
    },
  };
}

function budgetbuddy(overrides: Record<string, unknown> = {}) {
  return withIntegrity({
    contractVersion: "budgetbuddy.coach.snapshot.v2",
    capturedAt: "2026-08-09T10:30:00.000Z",
    currentMonthKey: "2026-08",
    dataQuality: {
      complete: true,
      unsupportedCurrencyCount: 0,
    },
    months: [{
      monthKey: "2026-08",
      consumerExpenseCents: 72_940,
      plannedCategoryBudgetsCents: 224_000,
      unassignedExpenseCount: 2,
      unassignedExpenseCents: 13_679,
    }],
    ...overrides,
  });
}

function getquin(overrides: Record<string, unknown> = {}) {
  return withIntegrity({
    contractVersion: "getquin.portfolio.snapshot.v1",
    capturedAt: "2026-08-09T05:00:00.000Z",
    dataQuality: { complete: true },
    ...overrides,
  });
}

describe("Alfred proactive monitor", () => {
  it("stays quiet for healthy snapshots and conservative current-month values", () => {
    expect(evaluateSignals({
      budgetbuddy: budgetbuddy(),
      getquin: getquin(),
      now: new Date("2026-08-09T11:00:00.000Z"),
    })).toEqual([]);
  });

  it("flags stale sources and unassigned expenses without an LLM", () => {
    const signals = evaluateSignals({
      budgetbuddy: budgetbuddy({
        capturedAt: "2026-08-09T07:00:00.000Z",
        months: [{
          monthKey: "2026-08",
          consumerExpenseCents: 20_000,
          plannedCategoryBudgetsCents: 224_000,
          unassignedExpenseCount: 5,
          unassignedExpenseCents: 15_000,
        }],
      }),
      getquin: getquin(),
      now: new Date("2026-08-09T11:00:00.000Z"),
    });

    expect(signals.map((entry: { key: string }) => entry.key)).toEqual([
      "budgetbuddy-stale",
      "budgetbuddy-unassigned",
    ]);
  });

  it("opens a signal only once and sends recovery only for technical signals", () => {
    const previous = [
      { key: "budgetbuddy-stale", source: "BudgetBuddy", kind: "technical" },
      { key: "budgetbuddy-unassigned", source: "BudgetBuddy", kind: "financial" },
    ];
    const current = [
      { key: "getquin-stale", source: "Getquin", kind: "technical", text: "stale" },
    ];

    expect(compareSignalState(previous, current)).toEqual({
      opened: current,
      recovered: [previous[0]],
    });
  });

  it("detects a materially excessive spending pace only after day seven", () => {
    const signals = evaluateSignals({
      budgetbuddy: budgetbuddy({
        months: [{
          monthKey: "2026-08",
          consumerExpenseCents: 100_000,
          plannedCategoryBudgetsCents: 200_000,
          unassignedExpenseCount: 0,
          unassignedExpenseCents: 0,
        }],
      }),
      getquin: getquin(),
      now: new Date("2026-08-10T10:00:00.000Z"),
    });

    expect(signals.map((entry: { key: string }) => entry.key)).toContain(
      "budgetbuddy-spending-pace",
    );
  });
});
