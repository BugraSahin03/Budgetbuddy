import { createHash } from "node:crypto";
import { constants, closeSync, fstatSync, openSync, readFileSync } from "node:fs";

export const SNAPSHOT_CONTRACT_VERSION = "getquin.portfolio.snapshot.v1";
export const DEFAULT_SNAPSHOT_PATH = "/var/lib/alfred-snapshots/getquin/latest.json";
export const DEFAULT_MAX_AGE_MINUTES = 2160;

const MAX_SNAPSHOT_BYTES = 2_000_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const ALLOWED_VIEWS = new Set([
  "overview",
  "positions",
  "allocation",
  "quality",
  "full",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRegularFileNoFollow(snapshotPath) {
  let descriptor;
  try {
    descriptor = openSync(snapshotPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) {
      throw new Error("Getquin snapshot is not a regular file.");
    }
    if (stats.size <= 0 || stats.size > MAX_SNAPSHOT_BYTES) {
      throw new Error("Getquin snapshot size is outside the accepted range.");
    }
    if ((stats.mode & 0o022) !== 0) {
      throw new Error("Getquin snapshot must not be group- or world-writable.");
    }
    return readFileSync(descriptor, "utf8");
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}

function validateSnapshotShape(snapshot) {
  if (!isPlainObject(snapshot)) {
    throw new Error("Getquin snapshot root must be an object.");
  }
  if (snapshot.contractVersion !== SNAPSHOT_CONTRACT_VERSION) {
    throw new Error(`Unsupported Getquin snapshot contract: ${snapshot.contractVersion}`);
  }
  if (
    !isPlainObject(snapshot.source) ||
    snapshot.source.system !== "getquin-public-share" ||
    snapshot.source.accessMode !== "https-public-share-readonly"
  ) {
    throw new Error("Getquin snapshot source metadata is invalid.");
  }
  if (
    snapshot.valuationCurrency !== "EUR" ||
    !isPlainObject(snapshot.portfolio) ||
    !Array.isArray(snapshot.positions) ||
    !isPlainObject(snapshot.allocations) ||
    !Array.isArray(snapshot.allocations.assetClasses) ||
    !isPlainObject(snapshot.concentration)
  ) {
    throw new Error("Getquin snapshot portfolio shape is invalid.");
  }
  if (!isPlainObject(snapshot.dataQuality) || !Array.isArray(snapshot.dataQuality.warnings)) {
    throw new Error("Getquin snapshot data-quality metadata is invalid.");
  }
  if (
    !isPlainObject(snapshot.privacy) ||
    snapshot.privacy.shareIdentifierIncluded !== false ||
    snapshot.privacy.profileIncluded !== false
  ) {
    throw new Error("Getquin snapshot privacy metadata is invalid.");
  }
  if (
    !isPlainObject(snapshot.integrity) ||
    snapshot.integrity.algorithm !== "sha256" ||
    !/^[a-f0-9]{64}$/.test(snapshot.integrity.dataSha256)
  ) {
    throw new Error("Getquin snapshot integrity metadata is invalid.");
  }
}

function verifyIntegrity(snapshot) {
  const withoutIntegrity = Object.fromEntries(
    Object.entries(snapshot).filter(([key]) => key !== "integrity"),
  );
  const actual = sha256(
    JSON.stringify({
      ...withoutIntegrity,
      capturedAt: undefined,
    }),
  );
  if (actual !== snapshot.integrity.dataSha256) {
    throw new Error("Getquin snapshot integrity verification failed.");
  }
}

function verifyFreshness(snapshot, now, maxAgeMinutes) {
  if (!Number.isInteger(maxAgeMinutes) || maxAgeMinutes < 60 || maxAgeMinutes > 10080) {
    throw new Error("maxAgeMinutes must be an integer between 60 and 10080.");
  }
  const capturedAtMs = Date.parse(snapshot.capturedAt);
  if (!Number.isFinite(capturedAtMs)) {
    throw new Error("Getquin snapshot capturedAt is invalid.");
  }
  const ageMs = now.getTime() - capturedAtMs;
  if (ageMs < -MAX_FUTURE_SKEW_MS) {
    throw new Error("Getquin snapshot timestamp is unexpectedly in the future.");
  }
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    throw new Error(`Getquin snapshot is stale (${Math.floor(ageMs / 60000)} minutes old).`);
  }
  return Math.max(0, Math.floor(ageMs / 60000));
}

export function loadVerifiedSnapshot(options = {}) {
  const snapshotPath = options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH;
  const maxAgeMinutes = options.maxAgeMinutes ?? DEFAULT_MAX_AGE_MINUTES;
  const now = options.now ?? new Date();
  const parsed = JSON.parse(readRegularFileNoFollow(snapshotPath));
  validateSnapshotShape(parsed);
  verifyIntegrity(parsed);
  return {
    snapshot: parsed,
    ageMinutes: verifyFreshness(parsed, now, maxAgeMinutes),
  };
}

export function selectSnapshotView(snapshot, requestedView = "overview") {
  const view = ALLOWED_VIEWS.has(requestedView) ? requestedView : "overview";
  if (view === "positions") {
    return {
      positions: snapshot.positions,
      marketData: snapshot.marketData,
      valuationCurrency: snapshot.valuationCurrency,
    };
  }
  if (view === "allocation") {
    return {
      allocations: snapshot.allocations,
      concentration: snapshot.concentration,
      valuationCurrency: snapshot.valuationCurrency,
    };
  }
  if (view === "quality") {
    return {
      dataQuality: snapshot.dataQuality,
      privacy: snapshot.privacy,
      marketData: snapshot.marketData,
    };
  }
  if (view === "full") {
    return snapshot;
  }
  return {
    portfolio: snapshot.portfolio,
    topPositions: snapshot.positions.slice(0, 5),
    allocations: snapshot.allocations,
    concentration: snapshot.concentration,
    marketData: snapshot.marketData,
    valuationCurrency: snapshot.valuationCurrency,
    dataQuality: snapshot.dataQuality,
  };
}
