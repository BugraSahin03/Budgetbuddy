import { createHash } from "node:crypto";
import { constants, closeSync, fstatSync, openSync, readFileSync } from "node:fs";

export const SNAPSHOT_CONTRACT_VERSION = "budgetbuddy.coach.snapshot.v2";
export const DEFAULT_SNAPSHOT_PATH =
  "/var/lib/alfred-snapshots/budgetbuddy/latest.json";
export const DEFAULT_MAX_AGE_MINUTES = 120;

const MAX_SNAPSHOT_BYTES = 2_000_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const ALLOWED_VIEWS = new Set([
  "overview",
  "months",
  "weeks",
  "fixed_costs",
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
      throw new Error("BudgetBuddy snapshot is not a regular file.");
    }
    if (stats.size <= 0 || stats.size > MAX_SNAPSHOT_BYTES) {
      throw new Error("BudgetBuddy snapshot size is outside the accepted range.");
    }
    if ((stats.mode & 0o022) !== 0) {
      throw new Error("BudgetBuddy snapshot must not be group- or world-writable.");
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
    throw new Error("BudgetBuddy snapshot root must be an object.");
  }
  if (snapshot.contractVersion !== SNAPSHOT_CONTRACT_VERSION) {
    throw new Error(`Unsupported BudgetBuddy snapshot contract: ${snapshot.contractVersion}`);
  }
  if (
    !isPlainObject(snapshot.source) ||
    snapshot.source.system !== "budgetbuddy" ||
    snapshot.source.accessMode !== "sqlite-readonly-query-only"
  ) {
    throw new Error("BudgetBuddy snapshot source metadata is invalid.");
  }
  if (!Array.isArray(snapshot.months) || !Array.isArray(snapshot.weeks)) {
    throw new Error("BudgetBuddy snapshot periods are invalid.");
  }
  if (
    !isPlainObject(snapshot.fixedCosts) ||
    !isPlainObject(snapshot.fixedCosts.semantics) ||
    !isPlainObject(snapshot.fixedCosts.currentPlan) ||
    !Array.isArray(snapshot.fixedCosts.currentPlan.items)
  ) {
    throw new Error("BudgetBuddy fixed-cost context is invalid.");
  }
  if (!isPlainObject(snapshot.dataQuality) || !Array.isArray(snapshot.dataQuality.warnings)) {
    throw new Error("BudgetBuddy snapshot data-quality metadata is invalid.");
  }
  if (
    !isPlainObject(snapshot.integrity) ||
    snapshot.integrity.algorithm !== "sha256" ||
    !/^[a-f0-9]{64}$/.test(snapshot.integrity.dataSha256)
  ) {
    throw new Error("BudgetBuddy snapshot integrity metadata is invalid.");
  }
}

function verifyIntegrity(snapshot) {
  const withoutIntegrity = Object.fromEntries(
    Object.entries(snapshot).filter(([key]) => key !== "integrity"),
  );
  const hashInput = {
    ...withoutIntegrity,
    capturedAt: undefined,
  };
  const actual = sha256(JSON.stringify(hashInput));
  if (actual !== snapshot.integrity.dataSha256) {
    throw new Error("BudgetBuddy snapshot integrity verification failed.");
  }
}

function verifyFreshness(snapshot, now, maxAgeMinutes) {
  if (!Number.isInteger(maxAgeMinutes) || maxAgeMinutes < 1 || maxAgeMinutes > 1440) {
    throw new Error("maxAgeMinutes must be an integer between 1 and 1440.");
  }
  const capturedAtMs = Date.parse(snapshot.capturedAt);
  if (!Number.isFinite(capturedAtMs)) {
    throw new Error("BudgetBuddy snapshot capturedAt is invalid.");
  }
  const ageMs = now.getTime() - capturedAtMs;
  if (ageMs < -MAX_FUTURE_SKEW_MS) {
    throw new Error("BudgetBuddy snapshot timestamp is unexpectedly in the future.");
  }
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    throw new Error(
      `BudgetBuddy snapshot is stale (${Math.floor(ageMs / 60000)} minutes old).`,
    );
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
  const ageMinutes = verifyFreshness(parsed, now, maxAgeMinutes);
  return { snapshot: parsed, ageMinutes };
}

export function selectSnapshotView(snapshot, requestedView = "overview") {
  const view = ALLOWED_VIEWS.has(requestedView) ? requestedView : "overview";
  const currentMonth = snapshot.months.find(
    (month) => month.monthKey === snapshot.currentMonthKey,
  ) ?? null;
  const previousMonth = [...snapshot.months]
    .reverse()
    .find((month) => month.monthKey < snapshot.currentMonthKey) ?? null;

  if (view === "months") {
    return { months: snapshot.months, period: snapshot.period };
  }
  if (view === "weeks") {
    return { weeks: snapshot.weeks, period: snapshot.period };
  }
  if (view === "fixed_costs") {
    return {
      fixedCosts: snapshot.fixedCosts,
      currentMonthKey: snapshot.currentMonthKey,
      currentMonthFixedCosts: currentMonth?.fixedCosts ?? null,
      monthlyFixedCostSummaries: snapshot.months.map((month) => ({
        monthKey: month.monthKey,
        status: month.status,
        fixedCosts: month.fixedCosts,
      })),
    };
  }
  if (view === "quality") {
    return { dataQuality: snapshot.dataQuality, privacy: snapshot.privacy };
  }
  if (view === "full") {
    return snapshot;
  }
  return {
    currentMonthKey: snapshot.currentMonthKey,
    currentMonth,
    previousMonth,
    fixedCosts: {
      semantics: snapshot.fixedCosts.semantics,
      currentPlan: {
        source: snapshot.fixedCosts.currentPlan.source,
        plannedCents: snapshot.fixedCosts.currentPlan.plannedCents,
        itemCount: snapshot.fixedCosts.currentPlan.itemCount,
        bookingDayKnownCount: snapshot.fixedCosts.currentPlan.bookingDayKnownCount,
        dueByDayOfMonth: snapshot.fixedCosts.currentPlan.dueByDayOfMonth,
      },
    },
    totals: snapshot.totals,
    accounts: snapshot.accounts,
    period: snapshot.period,
    dataQuality: snapshot.dataQuality,
  };
}
