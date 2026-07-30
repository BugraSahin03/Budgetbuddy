#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const SNAPSHOT_CONTRACT_VERSION = "getquin.portfolio.snapshot.v1";
export const EXTRACTOR_VERSION = "2026-07-19.1";

const DEFAULT_OUTPUT_DIRECTORY = "/var/lib/alfred-snapshots/getquin";
const SOURCE_ENVIRONMENT_VARIABLE = "GETQUIN_SHARE_URL";
const INITIAL_HOST = "getqu.in";
const TARGET_HOST = "app.getquin.com";
const ALLOWED_REDIRECT_QUERY_KEYS = new Set([
  "lang",
  "utm_campaign",
  "utm_medium",
  "utm_source",
]);
const MAX_RESPONSE_BYTES = 2_000_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_HISTORY_FILES = 400;
const MAX_POSITIONS = 500;
const QUOTE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_QUOTE_SKEW_MS = 24 * 60 * 60 * 1000;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireFiniteNumber(value, field, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Getquin field ${field} must be a finite number.`);
  }
  if (options.minimum !== undefined && value < options.minimum) {
    throw new Error(`Getquin field ${field} is below the accepted range.`);
  }
  if (options.maximum !== undefined && value > options.maximum) {
    throw new Error(`Getquin field ${field} is above the accepted range.`);
  }
  return value;
}

function toCents(value, field) {
  const cents = Math.round(requireFiniteNumber(value, field) * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Getquin field ${field} exceeds the safe money range.`);
  }
  return cents;
}

function sumCents(values, field) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error(`Getquin aggregate ${field} exceeds the safe money range.`);
  }
  return total;
}

function normalizeLabel(value, field, maximumLength = 160) {
  if (typeof value !== "string") {
    throw new Error(`Getquin field ${field} must be a string.`);
  }
  const normalized = value.replaceAll(/\s+/g, " ").trim();
  if (
    normalized.length === 0 ||
    normalized.length > maximumLength ||
    /[\u0000-\u001F\u007F]/.test(normalized)
  ) {
    throw new Error(`Getquin field ${field} is not a valid label.`);
  }
  return normalized;
}

function parseTimestamp(value, field) {
  if (typeof value !== "string") {
    throw new Error(`Getquin field ${field} must be an ISO timestamp.`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Getquin field ${field} must be an ISO timestamp.`);
  }
  return { iso: new Date(timestamp).toISOString(), timestamp };
}

export function validateInitialShareUrl(value) {
  let source;
  try {
    source = new URL(value);
  } catch {
    throw new Error("Getquin share URL is invalid.");
  }
  if (
    source.protocol !== "https:" ||
    source.hostname !== INITIAL_HOST ||
    source.username !== "" ||
    source.password !== "" ||
    source.search !== "" ||
    source.hash !== "" ||
    !/^\/[A-Za-z0-9_-]{6,128}\/?$/.test(source.pathname)
  ) {
    throw new Error("Getquin share URL is outside the accepted public-share scope.");
  }
  return source;
}

export function validateRedirectTarget(location, sourceUrl) {
  let target;
  try {
    target = new URL(location, sourceUrl);
  } catch {
    throw new Error("Getquin returned an invalid redirect target.");
  }
  const pathMatch = target.pathname.match(
    /^\/([a-z]{2})\/dashboard\/([A-Za-z0-9_-]{6,128})\/?$/,
  );
  if (
    target.protocol !== "https:" ||
    target.hostname !== TARGET_HOST ||
    target.username !== "" ||
    target.password !== "" ||
    target.hash !== "" ||
    !pathMatch
  ) {
    throw new Error("Getquin redirect left the accepted portfolio scope.");
  }
  for (const key of target.searchParams.keys()) {
    if (!ALLOWED_REDIRECT_QUERY_KEYS.has(key)) {
      throw new Error("Getquin redirect contains an unexpected query field.");
    }
  }
  return {
    target,
    locale: pathMatch[1],
    dashboardUuid: pathMatch[2],
  };
}

async function readResponseText(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Getquin response is larger than the accepted limit.");
  }
  if (!response.body) {
    throw new Error("Getquin response body is missing.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Getquin response is larger than the accepted limit.");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
}

export async function fetchPublicPortfolioPage(options) {
  const sourceUrl = validateInitialShareUrl(options.shareUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) {
    throw new Error("Getquin request timeout is outside the accepted range.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestOptions = {
    redirect: "manual",
    signal: controller.signal,
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "de-DE,de;q=0.9,en;q=0.5",
      "cache-control": "no-cache",
      "user-agent": `AlfredPortfolioCollector/${EXTRACTOR_VERSION}`,
    },
  };

  try {
    const firstResponse = await fetchImpl(sourceUrl, requestOptions);
    if (![301, 302, 303, 307, 308].includes(firstResponse.status)) {
      throw new Error("Getquin public share did not return the expected redirect.");
    }
    const location = firstResponse.headers.get("location");
    if (!location) {
      throw new Error("Getquin public share redirect is missing its target.");
    }
    await firstResponse.body?.cancel();
    const redirect = validateRedirectTarget(location, sourceUrl);

    const pageResponse = await fetchImpl(redirect.target, requestOptions);
    if (pageResponse.status !== 200) {
      throw new Error(`Getquin portfolio page returned HTTP ${pageResponse.status}.`);
    }
    const contentType = pageResponse.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error("Getquin portfolio page did not return HTML.");
    }
    const html = await readResponseText(pageResponse);
    return {
      html,
      dashboardUuid: redirect.dashboardUuid,
      locale: redirect.locale,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Getquin portfolio request timed out.");
    }
    if (error instanceof Error && error.message.startsWith("Getquin")) {
      throw error;
    }
    throw new Error("Getquin portfolio request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export function extractNextData(html) {
  if (typeof html !== "string" || html.length === 0 || html.length > MAX_RESPONSE_BYTES) {
    throw new Error("Getquin HTML is outside the accepted range.");
  }
  const match = html.match(
    /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) {
    throw new Error("Getquin page no longer contains the expected structured data.");
  }
  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    throw new Error("Getquin structured data is not valid JSON.");
  }
  if (!isPlainObject(parsed)) {
    throw new Error("Getquin structured data root is invalid.");
  }
  return parsed;
}

function findDashboard(nextData, expectedDashboardUuid) {
  if (
    nextData.page !== "/[locale]/dashboard/[uuid]" ||
    nextData.query?.uuid !== expectedDashboardUuid ||
    nextData.props?.pageProps?.serverSideNotFound !== false
  ) {
    throw new Error("Getquin page identity no longer matches the expected portfolio share.");
  }
  const appVersion = nextData.runtimeConfig?.APP_VERSION;
  if (typeof appVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(appVersion)) {
    throw new Error("Getquin application version is missing or invalid.");
  }

  const cache = nextData.props?.queryClientCache;
  const rootQuery = cache?.ROOT_QUERY;
  if (!isPlainObject(cache) || !isPlainObject(rootQuery)) {
    throw new Error("Getquin portfolio cache is missing.");
  }
  const dashboardKeys = Object.keys(rootQuery).filter((key) =>
    key.startsWith("getDashboard("),
  );
  if (dashboardKeys.length !== 1) {
    throw new Error("Getquin portfolio cache contains an unexpected dashboard shape.");
  }
  const dashboardKey = dashboardKeys[0];
  const argumentMatch = dashboardKey.match(/^getDashboard\((.*)\)$/);
  let dashboardArguments;
  try {
    dashboardArguments = argumentMatch ? JSON.parse(argumentMatch[1]) : null;
  } catch {
    dashboardArguments = null;
  }
  if (
    !isPlainObject(dashboardArguments) ||
    dashboardArguments.uuid !== expectedDashboardUuid ||
    dashboardArguments.currency !== "EUR"
  ) {
    throw new Error("Getquin dashboard query arguments are outside the accepted scope.");
  }
  const dashboard = rootQuery[dashboardKey];
  if (
    !isPlainObject(dashboard) ||
    dashboard.__typename !== "AggregatedDashboard" ||
    dashboard.is_sample !== false ||
    !Array.isArray(dashboard.positions) ||
    dashboard.positions.length > MAX_POSITIONS
  ) {
    throw new Error("Getquin dashboard data is invalid.");
  }
  return { cache, dashboard, appVersion };
}

function normalizeAssetClass(category, instrumentType) {
  if (category === "stock") {
    return "stock";
  }
  if (category === "etf" || instrumentType === "etp") {
    return "etf";
  }
  if (category === "crypto") {
    return "crypto";
  }
  if (category === "bond") {
    return "bond";
  }
  if (category === "fund") {
    return "fund";
  }
  return "other";
}

function normalizePosition(position, cache, index, nowMs) {
  if (!isPlainObject(position)) {
    throw new Error(`Getquin position ${index} is invalid.`);
  }
  const instrumentRef = position.instrument?.__ref;
  const instrument = typeof instrumentRef === "string" ? cache[instrumentRef] : null;
  if (!isPlainObject(instrument) || instrument.__typename !== "Instrument") {
    throw new Error(`Getquin position ${index} instrument is missing.`);
  }
  if (position.original_currency !== "EUR") {
    throw new Error("Getquin position currency is not supported by this extractor.");
  }

  const units = requireFiniteNumber(position.units, `positions[${index}].units`, {
    minimum: 0,
    maximum: 1_000_000_000_000,
  });
  const costBasisCents = toCents(
    requireFiniteNumber(position.capital_invested, `positions[${index}].capital_invested`, {
      minimum: 0,
    }),
    `positions[${index}].capital_invested`,
  );
  const lastValue = position.lastValue;
  if (!isPlainObject(lastValue)) {
    throw new Error(`Getquin position ${index} current quote is missing.`);
  }
  const currentPrice = requireFiniteNumber(lastValue.value, `positions[${index}].lastValue`, {
    minimum: 0,
  });
  const quote = parseTimestamp(lastValue.timestamp, `positions[${index}].lastValue.timestamp`);
  if (quote.timestamp > nowMs + MAX_FUTURE_QUOTE_SKEW_MS) {
    throw new Error(`Getquin position ${index} quote is unexpectedly in the future.`);
  }
  const currentValueCents = toCents(
    units * currentPrice,
    `positions[${index}].currentValue`,
  );
  const unrealizedGainCents = currentValueCents - costBasisCents;
  const unrealizedGainBasisPoints =
    costBasisCents > 0 ? Math.round((unrealizedGainCents / costBasisCents) * 10_000) : null;

  const symbol = normalizeLabel(instrument.symbol, `positions[${index}].symbol`, 64);
  const tickerValue =
    typeof instrument.ticker === "string" && instrument.ticker.trim()
      ? normalizeLabel(instrument.ticker, `positions[${index}].ticker`, 32)
      : symbol;
  const nameValue = instrument.short_name ?? instrument.name ?? position.security_name;
  const name = normalizeLabel(nameValue, `positions[${index}].name`);
  const opened = parseTimestamp(position.opened, `positions[${index}].opened`);

  return {
    name,
    ticker: tickerValue,
    symbol,
    assetClass: normalizeAssetClass(instrument.category, instrument.instrument_type),
    units,
    valuationCurrency: "EUR",
    currentPriceCents: toCents(currentPrice, `positions[${index}].lastValue`),
    currentValueCents,
    costBasisCents,
    unrealizedGainCents,
    unrealizedGainBasisPoints,
    openedDate: opened.iso.slice(0, 10),
    quoteAsOf: quote.iso,
    quoteTimestamp: quote.timestamp,
  };
}

function buildAllocations(positions, totalCurrentValueCents) {
  const groups = new Map();
  for (const position of positions) {
    const current = groups.get(position.assetClass) ?? {
      assetClass: position.assetClass,
      currentValueCents: 0,
      positionCount: 0,
    };
    current.currentValueCents += position.currentValueCents;
    current.positionCount += 1;
    groups.set(position.assetClass, current);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      weightBasisPoints:
        totalCurrentValueCents > 0
          ? Math.round((group.currentValueCents / totalCurrentValueCents) * 10_000)
          : 0,
    }))
    .sort(
      (left, right) =>
        right.currentValueCents - left.currentValueCents ||
        left.assetClass.localeCompare(right.assetClass),
    );
}

function buildConcentration(positions, totalCurrentValueCents) {
  const weights = positions.map((position) =>
    totalCurrentValueCents > 0 ? position.currentValueCents / totalCurrentValueCents : 0,
  );
  const topWeight = (count) =>
    Math.round(weights.slice(0, count).reduce((sum, weight) => sum + weight, 0) * 10_000);
  return {
    top1WeightBasisPoints: topWeight(1),
    top3WeightBasisPoints: topWeight(3),
    top5WeightBasisPoints: topWeight(5),
    herfindahlIndexBasisPoints: Math.round(
      weights.reduce((sum, weight) => sum + weight * weight, 0) * 10_000,
    ),
  };
}

export function buildSnapshotFromNextData(nextData, options) {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) {
    throw new Error("Snapshot timestamp is invalid.");
  }
  const { cache, dashboard, appVersion } = findDashboard(
    nextData,
    options.dashboardUuid,
  );

  const allPositions = dashboard.positions;
  const activeSourcePositions = allPositions.filter(
    (position) => isPlainObject(position) && position.closed === null && position.units > 0,
  );
  const normalizedPositions = activeSourcePositions
    .map((position, index) => normalizePosition(position, cache, index, nowMs))
    .sort(
      (left, right) =>
        right.currentValueCents - left.currentValueCents ||
        left.name.localeCompare(right.name, "de"),
    );

  const symbols = new Set();
  for (const position of normalizedPositions) {
    if (symbols.has(position.symbol)) {
      throw new Error("Getquin current positions contain a duplicate instrument symbol.");
    }
    symbols.add(position.symbol);
  }

  const totalCurrentValueCents = sumCents(
    normalizedPositions.map((position) => position.currentValueCents),
    "currentValue",
  );
  const totalCostBasisCents = sumCents(
    normalizedPositions.map((position) => position.costBasisCents),
    "costBasis",
  );
  const unrealizedGainCents = totalCurrentValueCents - totalCostBasisCents;
  const quoteTimestamps = normalizedPositions.map((position) => position.quoteTimestamp);
  const oldestQuoteTimestamp = quoteTimestamps.length > 0 ? Math.min(...quoteTimestamps) : null;
  const newestQuoteTimestamp = quoteTimestamps.length > 0 ? Math.max(...quoteTimestamps) : null;
  const staleQuoteCount = normalizedPositions.filter(
    (position) => nowMs - position.quoteTimestamp > QUOTE_STALE_AFTER_MS,
  ).length;
  const zeroCostBasisCount = normalizedPositions.filter(
    (position) => position.costBasisCents === 0,
  ).length;
  const warnings = [];
  if (normalizedPositions.length === 0) {
    warnings.push("EMPTY_PORTFOLIO");
  }
  if (staleQuoteCount > 0) {
    warnings.push("STALE_POSITION_QUOTES");
  }
  if (zeroCostBasisCount > 0) {
    warnings.push("ZERO_COST_BASIS_POSITIONS");
  }

  const openedDates = allPositions
    .map((position, index) => {
      if (!isPlainObject(position) || typeof position.opened !== "string") {
        return null;
      }
      return parseTimestamp(position.opened, `positions[${index}].opened`).iso.slice(0, 10);
    })
    .filter(Boolean)
    .sort();
  const positions = normalizedPositions.map((position) => {
    const publicPosition = { ...position };
    delete publicPosition.quoteTimestamp;
    return publicPosition;
  });
  const capturedAt = now.toISOString();
  const snapshotWithoutIntegrity = {
    contractVersion: SNAPSHOT_CONTRACT_VERSION,
    source: {
      system: "getquin-public-share",
      accessMode: "https-public-share-readonly",
      extractorVersion: EXTRACTOR_VERSION,
      pageAppVersion: appVersion,
    },
    capturedAt,
    valuationCurrency: "EUR",
    marketData: {
      oldestQuoteAt:
        oldestQuoteTimestamp === null ? null : new Date(oldestQuoteTimestamp).toISOString(),
      newestQuoteAt:
        newestQuoteTimestamp === null ? null : new Date(newestQuoteTimestamp).toISOString(),
    },
    portfolio: {
      currentPositionCount: positions.length,
      closedPositionCountObserved: allPositions.length - activeSourcePositions.length,
      investedSince: openedDates[0] ?? null,
      currentValueCents: totalCurrentValueCents,
      costBasisCents: totalCostBasisCents,
      unrealizedGainCents,
      unrealizedGainBasisPoints:
        totalCostBasisCents > 0
          ? Math.round((unrealizedGainCents / totalCostBasisCents) * 10_000)
          : null,
      visibleLifetimeDividendsCents: toCents(
        requireFiniteNumber(dashboard.dividends, "dashboard.dividends", { minimum: 0 }),
        "dashboard.dividends",
      ),
      visibleLifetimeInterestCents: toCents(
        requireFiniteNumber(dashboard.interests, "dashboard.interests", { minimum: 0 }),
        "dashboard.interests",
      ),
      visibleLifetimeCostsCents: toCents(
        requireFiniteNumber(dashboard.costs, "dashboard.costs", { minimum: 0 }),
        "dashboard.costs",
      ),
      visibleLifetimeTaxesCents: toCents(
        requireFiniteNumber(dashboard.taxes, "dashboard.taxes", { minimum: 0 }),
        "dashboard.taxes",
      ),
    },
    positions,
    allocations: {
      assetClasses: buildAllocations(positions, totalCurrentValueCents),
    },
    concentration: buildConcentration(positions, totalCurrentValueCents),
    dataQuality: {
      complete: warnings.length === 0,
      warnings,
      staleQuoteCount,
      zeroCostBasisCount,
      limitations: [
        "PUBLIC_SHARE_SCOPE_ONLY",
        "NO_TRANSACTION_CASHFLOWS",
        "NO_TIME_OR_MONEY_WEIGHTED_RETURN",
        "UNREALIZED_GAIN_IS_CURRENT_VALUE_MINUS_VISIBLE_COST_BASIS",
      ],
    },
    privacy: {
      publicBearerShare: true,
      shareIdentifierIncluded: false,
      profileIncluded: false,
      excludedFields: [
        "share.url",
        "share.uuid",
        "profile.id",
        "profile.name",
        "profile.username",
        "profile.avatar",
        "community.content",
        "runtime.config",
      ],
    },
  };
  const hashInput = { ...snapshotWithoutIntegrity, capturedAt: undefined };
  return {
    ...snapshotWithoutIntegrity,
    integrity: {
      algorithm: "sha256",
      dataSha256: sha256(JSON.stringify(hashInput)),
    },
  };
}

function writeAtomically(filePath, content) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o640);
    writeFileSync(descriptor, content, "utf8");
    closeSync(descriptor);
    descriptor = undefined;
    chmodSync(temporaryPath, 0o640);
    renameSync(temporaryPath, filePath);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    rmSync(temporaryPath, { force: true });
  }
}

function readExistingHash(latestPath) {
  if (!existsSync(latestPath)) {
    return null;
  }
  const stats = statSync(latestPath);
  if (!stats.isFile() || stats.size > MAX_RESPONSE_BYTES) {
    throw new Error("Existing Getquin snapshot is not a valid regular file.");
  }
  const parsed = JSON.parse(readFileSync(latestPath, "utf8"));
  return parsed?.integrity?.dataSha256 ?? null;
}

function pruneHistory(historyDirectory) {
  const files = readdirSync(historyDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  for (const name of files.slice(0, Math.max(0, files.length - MAX_HISTORY_FILES))) {
    rmSync(path.join(historyDirectory, name), { force: true });
  }
}

export function persistSnapshot(snapshot, outputDirectory) {
  mkdirSync(outputDirectory, { recursive: true, mode: 0o750 });
  const historyDirectory = path.join(outputDirectory, "history");
  mkdirSync(historyDirectory, { recursive: true, mode: 0o750 });

  const latestPath = path.join(outputDirectory, "latest.json");
  const existingHash = readExistingHash(latestPath);
  const content = `${JSON.stringify(snapshot, null, 2)}\n`;
  const changed = existingHash !== snapshot.integrity.dataSha256;
  if (changed) {
    const timestamp = snapshot.capturedAt.replaceAll("-", "").replaceAll(":", "");
    const historyName = `${timestamp}-${snapshot.integrity.dataSha256.slice(0, 12)}.json`;
    writeAtomically(path.join(historyDirectory, historyName), content);
    pruneHistory(historyDirectory);
  }
  writeAtomically(latestPath, content);
  return {
    latestPath,
    changed,
    dataSha256: snapshot.integrity.dataSha256,
  };
}

export async function collectSnapshot(options = {}) {
  const shareUrl = options.shareUrl ?? process.env[SOURCE_ENVIRONMENT_VARIABLE];
  if (!shareUrl) {
    throw new Error(`${SOURCE_ENVIRONMENT_VARIABLE} is not configured.`);
  }
  const outputDirectory = options.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  const page = await fetchPublicPortfolioPage({
    shareUrl,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
  const nextData = extractNextData(page.html);
  const snapshot = buildSnapshotFromNextData(nextData, {
    dashboardUuid: page.dashboardUuid,
    now: options.now,
  });
  const persisted = persistSnapshot(snapshot, outputDirectory);
  return { snapshot, ...persisted };
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--output" && value) {
      result.outputDirectory = value;
      index += 1;
    } else if (argument === "--now" && value) {
      const now = new Date(value);
      if (Number.isNaN(now.getTime())) {
        throw new Error("--now must be an ISO timestamp.");
      }
      result.now = now;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  return result;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  process.umask(0o027);
  try {
    const result = await collectSnapshot(parseArguments(process.argv.slice(2)));
    console.log(
      JSON.stringify({
        status: "ok",
        contractVersion: result.snapshot.contractVersion,
        extractorVersion: result.snapshot.source.extractorVersion,
        pageAppVersion: result.snapshot.source.pageAppVersion,
        capturedAt: result.snapshot.capturedAt,
        currentPositionCount: result.snapshot.portfolio.currentPositionCount,
        warningCodes: result.snapshot.dataQuality.warnings,
        changed: result.changed,
        dataSha256: result.dataSha256,
        latestPath: result.latestPath,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  }
}
