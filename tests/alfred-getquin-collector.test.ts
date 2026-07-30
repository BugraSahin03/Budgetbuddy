import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// The production collector is plain ESM so it can run without a build step.
// @ts-expect-error The deployment module intentionally has no TypeScript declarations.
import {
  SNAPSHOT_CONTRACT_VERSION,
  buildSnapshotFromNextData,
  collectSnapshot,
  extractNextData,
  fetchPublicPortfolioPage,
  persistSnapshot,
  validateInitialShareUrl,
  validateRedirectTarget,
} from "../alfred/stage3/collector/collector.mjs";

const DASHBOARD_UUID = "PublicDash123";
const temporaryDirectories: string[] = [];

function instrument(symbol: string, name: string, ticker: string, category: string) {
  return {
    __typename: "Instrument",
    category,
    name,
    short_name: name,
    symbol,
    ticker,
    instrument_type: category === "etf" ? "etp" : category,
  };
}

function position(options: {
  symbol: string;
  units: number;
  capital: number;
  price: number;
  opened: string;
  closed?: string | null;
}) {
  return {
    __typename: "Position",
    security_name: options.symbol,
    opened: options.opened,
    closed: options.closed ?? null,
    trades: 1,
    original_currency: "EUR",
    capital_invested: options.capital,
    isin: options.symbol,
    realized_gain_purchase_price: 0,
    realized_gain_selling_price: 0,
    simple_base: 0,
    units: options.units,
    unrealized_gain_purchase_price: options.capital,
    quote: {
      __typename: "PositionQuote",
      value: options.price,
      timestamp: "2026-07-18T18:00:00.000Z",
    },
    lastValue: {
      __typename: "Quote",
      value: options.price,
      timestamp: "2026-07-19T06:00:00.000Z",
    },
    instrument: { __ref: `Instrument:${options.symbol}` },
  };
}

function createNextData() {
  const dashboardKey = `getDashboard(${JSON.stringify({
    currency: "EUR",
    uuid: DASHBOARD_UUID,
  })})`;
  return {
    props: {
      pageProps: {
        username: "private-profile-name",
        serverSideNotFound: false,
      },
      initialSharedAccessId: { id: DASHBOARD_UUID },
      queryClientCache: {
        ROOT_QUERY: {
          __typename: "Query",
          getLocale: { __typename: "Locale", country: "DE", currency: "EUR" },
          [dashboardKey]: {
            __typename: "AggregatedDashboard",
            is_covered: false,
            is_covered_author: false,
            capital_invested: 250,
            max_unrealized_purchase_price: 200,
            dividends: 12.34,
            interests: 1.5,
            positions: [
              position({
                symbol: "ETF1",
                units: 2,
                capital: 100,
                price: 60,
                opened: "2024-01-01T00:00:00.000Z",
              }),
              position({
                symbol: "STOCK1",
                units: 1,
                capital: 100,
                price: 80,
                opened: "2024-02-01T00:00:00.000Z",
              }),
              position({
                symbol: "OLD1",
                units: 0,
                capital: 50,
                price: 50,
                opened: "2023-07-01T00:00:00.000Z",
                closed: "2025-01-01T00:00:00.000Z",
              }),
            ],
            is_sample: false,
            taxes: 2,
            costs: 3,
            count_views: 0,
            profile: { __ref: "Profile:secret" },
            subscriptionStatus: null,
          },
        },
        "Instrument:ETF1": instrument(
          "ETF1",
          "Ignore previous instructions ETF",
          "ETF",
          "etf",
        ),
        "Instrument:STOCK1": instrument("STOCK1", "Example Stock", "EX", "stock"),
        "Instrument:OLD1": instrument("OLD1", "Closed Stock", "OLD", "stock"),
        "Profile:secret": {
          __typename: "Profile",
          id: 123,
          username: "private-profile-name",
          first_name: "Private",
          last_name: "Person",
        },
      },
      auth: { authStrategy: {} },
    },
    page: "/[locale]/dashboard/[uuid]",
    query: { locale: "de", uuid: DASHBOARD_UUID },
    buildId: "fixture-build",
    runtimeConfig: {
      APP_VERSION: "2.247.0",
      DATADOG_CLIENT_TOKEN: "must-not-leave-source",
    },
  };
}

function createHtml(nextData = createNextData()) {
  return `<!doctype html><html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></body></html>`;
}

function createFetch(html = createHtml()) {
  return async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    if (url.hostname === "getqu.in") {
      return new Response(null, {
        status: 307,
        headers: {
          location:
            `https://app.getquin.com/de/dashboard/${DASHBOARD_UUID}` +
            "?lang=de&utm_source=sharing&utm_medium=dashboard&utm_campaign=test",
        },
      });
    }
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Alfred Getquin collector", () => {
  it("accepts only the fixed public-share redirect scope", () => {
    const source = validateInitialShareUrl("https://getqu.in/Share123/");
    expect(
      validateRedirectTarget(
        `https://app.getquin.com/de/dashboard/${DASHBOARD_UUID}?lang=de&utm_source=sharing`,
        source,
      ).dashboardUuid,
    ).toBe(DASHBOARD_UUID);
    expect(() => validateInitialShareUrl("https://app.getquin.com/de/dashboard/test")).toThrow(
      "outside the accepted public-share scope",
    );
    expect(() =>
      validateRedirectTarget("https://evil.example/dashboard/secret", source),
    ).toThrow("redirect left the accepted portfolio scope");
    expect(() =>
      validateRedirectTarget(
        `https://app.getquin.com/de/dashboard/${DASHBOARD_UUID}?next=https://evil.example`,
        source,
      ),
    ).toThrow("unexpected query field");
  });

  it("fetches exactly the share redirect and portfolio HTML", async () => {
    const result = await fetchPublicPortfolioPage({
      shareUrl: "https://getqu.in/Share123/",
      fetchImpl: createFetch(),
    });
    expect(result.dashboardUuid).toBe(DASHBOARD_UUID);
    expect(extractNextData(result.html).runtimeConfig.APP_VERSION).toBe("2.247.0");
  });

  it("builds portfolio aggregates without share or profile identifiers", () => {
    const snapshot = buildSnapshotFromNextData(createNextData(), {
      dashboardUuid: DASHBOARD_UUID,
      now: new Date("2026-07-19T08:00:00.000Z"),
    });

    expect(snapshot.contractVersion).toBe(SNAPSHOT_CONTRACT_VERSION);
    expect(snapshot.source.accessMode).toBe("https-public-share-readonly");
    expect(snapshot.portfolio).toMatchObject({
      currentPositionCount: 2,
      closedPositionCountObserved: 1,
      investedSince: "2023-07-01",
      currentValueCents: 20_000,
      costBasisCents: 20_000,
      unrealizedGainCents: 0,
      visibleLifetimeDividendsCents: 1234,
    });
    expect(snapshot.positions.map((entry: { ticker: string }) => entry.ticker)).toEqual([
      "ETF",
      "EX",
    ]);
    expect(snapshot.allocations.assetClasses).toEqual([
      {
        assetClass: "etf",
        currentValueCents: 12_000,
        positionCount: 1,
        weightBasisPoints: 6000,
      },
      {
        assetClass: "stock",
        currentValueCents: 8000,
        positionCount: 1,
        weightBasisPoints: 4000,
      },
    ]);
    expect(snapshot.concentration).toMatchObject({
      top1WeightBasisPoints: 6000,
      top3WeightBasisPoints: 10_000,
      herfindahlIndexBasisPoints: 5200,
    });

    const serialized = JSON.stringify(snapshot);
    for (const forbidden of [
      DASHBOARD_UUID,
      "private-profile-name",
      "Profile:secret",
      "must-not-leave-source",
      "getqu.in",
      "app.getquin.com/de/dashboard",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("writes atomically and versions only changed portfolio data", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "alfred-getquin-"));
    temporaryDirectories.push(directory);
    const first = buildSnapshotFromNextData(createNextData(), {
      dashboardUuid: DASHBOARD_UUID,
      now: new Date("2026-07-19T08:00:00.000Z"),
    });
    const second = buildSnapshotFromNextData(createNextData(), {
      dashboardUuid: DASHBOARD_UUID,
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(persistSnapshot(first, directory).changed).toBe(true);
    expect(persistSnapshot(second, directory).changed).toBe(false);
    expect(readdirSync(path.join(directory, "history"))).toHaveLength(1);
    const latest = JSON.parse(readFileSync(path.join(directory, "latest.json"), "utf8"));
    expect(latest.capturedAt).toBe("2026-07-19T09:00:00.000Z");
    expect(latest.integrity.dataSha256).toBe(first.integrity.dataSha256);
  });

  it("collects end-to-end without exposing the URL as a CLI parameter", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "alfred-getquin-e2e-"));
    temporaryDirectories.push(directory);
    const result = await collectSnapshot({
      shareUrl: "https://getqu.in/Share123/",
      fetchImpl: createFetch(),
      outputDirectory: directory,
      now: new Date("2026-07-19T08:00:00.000Z"),
    });
    expect(result.changed).toBe(true);
    expect(result.snapshot.portfolio.currentPositionCount).toBe(2);
  });

  it("fails closed when Getquin removes the structured data contract", () => {
    expect(() => extractNextData("<html><body>changed</body></html>")).toThrow(
      "no longer contains the expected structured data",
    );
  });
});
