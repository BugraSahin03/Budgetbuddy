import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// The production reader is plain ESM so OpenClaw can load it without a build step.
// @ts-expect-error The deployment module intentionally has no TypeScript declarations.
import {
  loadVerifiedSnapshot,
  selectSnapshotView,
} from "../alfred/stage2/plugin/snapshot-reader.mjs";

const temporaryDirectories: string[] = [];

function createSnapshot(capturedAt: string) {
  const snapshotWithoutIntegrity = {
    contractVersion: "budgetbuddy.coach.snapshot.v2",
    source: {
      system: "budgetbuddy",
      schemaVersion: "0018_fin_120",
      queryCatalogVersion: "2026-07-22.1",
      accessMode: "sqlite-readonly-query-only",
    },
    capturedAt,
    timeZone: "Europe/Berlin",
    period: {
      fromMonth: "2026-06",
      toMonth: "2026-07",
      weekFrom: "2026-07-06",
      weekTo: "2026-07-19",
    },
    currentMonthKey: "2026-07",
    totals: { incomeCents: 300_000, expenseCents: 100_000 },
    accounts: [{ name: "Bank", currentBalanceCents: 500_000 }],
    fixedCosts: {
      semantics: {
        plan: "planned",
        actualControl: "observed",
        expense: "expense semantics",
      },
      currentPlan: {
        source: "active_fixed_costs",
        plannedCents: 90_000,
        itemCount: 2,
        bookingDayKnownCount: 1,
        dueByDayOfMonth: [{ day: 1, itemCount: 1, plannedCents: 80_000 }],
        items: [
          { name: "Rent", plannedAmountCents: 80_000, bookingDayOfMonth: 1 },
          { name: "Subscription", plannedAmountCents: 10_000, bookingDayOfMonth: null },
        ],
      },
      historicalMonthClosePlans: [],
    },
    months: [
      {
        monthKey: "2026-06",
        status: "closed",
        expenseCents: 80_000,
        fixedCosts: { plannedCents: 85_000, actualControlCents: 85_000 },
      },
      {
        monthKey: "2026-07",
        status: "open",
        expenseCents: 100_000,
        fixedCosts: { plannedCents: 90_000, actualControlCents: 70_000 },
      },
    ],
    weeks: [{ weekStart: "2026-07-06", expenseCents: 25_000 }],
    dataQuality: { complete: true, warnings: [] },
    privacy: {
      transactionAggregationOnly: true,
      fixedCostPlanItemsIncluded: true,
      excludedFields: ["transaction.description"],
    },
  };
  const hashInput = { ...snapshotWithoutIntegrity, capturedAt: undefined };
  return {
    ...snapshotWithoutIntegrity,
    integrity: {
      algorithm: "sha256",
      dataSha256: createHash("sha256")
        .update(JSON.stringify(hashInput))
        .digest("hex"),
    },
  };
}

function writeSnapshot(snapshot: ReturnType<typeof createSnapshot>) {
  const directory = mkdtempSync(path.join(tmpdir(), "alfred-snapshot-tool-"));
  temporaryDirectories.push(directory);
  const snapshotPath = path.join(directory, "latest.json");
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o640 });
  return snapshotPath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Alfred BudgetBuddy snapshot reader", () => {
  it("verifies a fresh snapshot and returns a bounded overview", () => {
    const snapshotPath = writeSnapshot(createSnapshot("2026-07-15T12:00:00.000Z"));
    const { snapshot, ageMinutes } = loadVerifiedSnapshot({
      snapshotPath,
      now: new Date("2026-07-15T12:10:00.000Z"),
      maxAgeMinutes: 45,
    });

    expect(ageMinutes).toBe(10);
    expect(selectSnapshotView(snapshot, "overview")).toMatchObject({
      currentMonth: { monthKey: "2026-07", expenseCents: 100_000 },
      previousMonth: { monthKey: "2026-06", expenseCents: 80_000 },
      dataQuality: { complete: true, warnings: [] },
    });
    expect(selectSnapshotView(snapshot, "overview")).not.toHaveProperty("weeks");
  });

  it("fails closed when financial data is modified after hashing", () => {
    const snapshot = createSnapshot("2026-07-15T12:00:00.000Z");
    snapshot.months[1].expenseCents = 999_999;
    const snapshotPath = writeSnapshot(snapshot);

    expect(() =>
      loadVerifiedSnapshot({
        snapshotPath,
        now: new Date("2026-07-15T12:10:00.000Z"),
      }),
    ).toThrow("integrity verification failed");
  });

  it("returns fixed-cost plan items separately from observed control totals", () => {
    const snapshot = createSnapshot("2026-07-15T12:00:00.000Z");
    expect(selectSnapshotView(snapshot, "fixed_costs")).toMatchObject({
      currentMonthKey: "2026-07",
      fixedCosts: {
        currentPlan: {
          plannedCents: 90_000,
          items: [
            { name: "Rent", plannedAmountCents: 80_000 },
            { name: "Subscription", plannedAmountCents: 10_000 },
          ],
        },
      },
      currentMonthFixedCosts: {
        plannedCents: 90_000,
        actualControlCents: 70_000,
      },
    });
  });

  it("fails closed when the snapshot is stale", () => {
    const snapshotPath = writeSnapshot(createSnapshot("2026-07-15T10:00:00.000Z"));

    expect(() =>
      loadVerifiedSnapshot({
        snapshotPath,
        now: new Date("2026-07-15T12:00:00.000Z"),
        maxAgeMinutes: 45,
      }),
    ).toThrow("snapshot is stale");
  });
});
