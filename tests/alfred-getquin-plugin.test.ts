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
} from "../alfred/stage3/plugin/snapshot-reader.mjs";

const temporaryDirectories: string[] = [];

function createSnapshot(capturedAt: string) {
  const snapshotWithoutIntegrity = {
    contractVersion: "getquin.portfolio.snapshot.v1",
    source: {
      system: "getquin-public-share",
      accessMode: "https-public-share-readonly",
      extractorVersion: "2026-07-19.1",
      pageAppVersion: "2.247.0",
    },
    capturedAt,
    valuationCurrency: "EUR",
    marketData: {
      oldestQuoteAt: "2026-07-18T20:00:00.000Z",
      newestQuoteAt: "2026-07-19T06:00:00.000Z",
    },
    portfolio: {
      currentPositionCount: 2,
      currentValueCents: 20_000,
      costBasisCents: 18_000,
      unrealizedGainCents: 2000,
    },
    positions: [
      { name: "ETF", ticker: "ETF", currentValueCents: 12_000 },
      { name: "Stock", ticker: "STK", currentValueCents: 8000 },
    ],
    allocations: {
      assetClasses: [{ assetClass: "etf", weightBasisPoints: 6000 }],
    },
    concentration: { top1WeightBasisPoints: 6000 },
    dataQuality: { complete: true, warnings: [], limitations: [] },
    privacy: {
      publicBearerShare: true,
      shareIdentifierIncluded: false,
      profileIncluded: false,
      excludedFields: ["share.url"],
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
  const directory = mkdtempSync(path.join(tmpdir(), "alfred-getquin-tool-"));
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

describe("Alfred Getquin snapshot reader", () => {
  it("verifies a fresh snapshot and returns a bounded overview", () => {
    const snapshotPath = writeSnapshot(createSnapshot("2026-07-19T08:00:00.000Z"));
    const { snapshot, ageMinutes } = loadVerifiedSnapshot({
      snapshotPath,
      now: new Date("2026-07-19T09:00:00.000Z"),
      maxAgeMinutes: 2160,
    });
    const overview = selectSnapshotView(snapshot, "overview");

    expect(ageMinutes).toBe(60);
    expect(overview).toMatchObject({
      portfolio: { currentPositionCount: 2, currentValueCents: 20_000 },
      concentration: { top1WeightBasisPoints: 6000 },
    });
    expect(overview.topPositions).toHaveLength(2);
  });

  it("fails closed when portfolio data is modified after hashing", () => {
    const snapshot = createSnapshot("2026-07-19T08:00:00.000Z");
    snapshot.portfolio.currentValueCents = 999_999;
    const snapshotPath = writeSnapshot(snapshot);

    expect(() =>
      loadVerifiedSnapshot({
        snapshotPath,
        now: new Date("2026-07-19T09:00:00.000Z"),
      }),
    ).toThrow("integrity verification failed");
  });

  it("fails closed when the daily portfolio snapshot is stale", () => {
    const snapshotPath = writeSnapshot(createSnapshot("2026-07-17T08:00:00.000Z"));

    expect(() =>
      loadVerifiedSnapshot({
        snapshotPath,
        now: new Date("2026-07-19T09:00:00.000Z"),
        maxAgeMinutes: 2160,
      }),
    ).toThrow("snapshot is stale");
  });
});
