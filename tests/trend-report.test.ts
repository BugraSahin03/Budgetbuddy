import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type TrendReportModule = typeof import("@/src/analytics/trend-report");

let dbClient: DbClientModule;
let trendModule: TrendReportModule;

const PREFIX = "TEST-FIN-015-";

function cleanup(): void {
  const db = dbClient.getDb();

  db.prepare("DELETE FROM transactions WHERE description LIKE ?").run(`${PREFIX}%`);
  db.prepare("DELETE FROM monthly_category_budgets WHERE month_key IN ('2033-01', '2033-02', '2033-03')").run();
}

function getAccountId(name: "Sparkasse"): number {
  return (dbClient.getDb().prepare("SELECT id FROM accounts WHERE name = ?").get(name) as { id: number }).id;
}

function getCategoryId(name: string): number {
  return (dbClient.getDb().prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: number }).id;
}

beforeAll(async () => {
  dbClient = await import("@/src/db/client");
  trendModule = await import("@/src/analytics/trend-report");
});

describe("trend report analytics", () => {
  it("builds monthly trends, averages and outlier flags", () => {
    cleanup();

    const db = dbClient.getDb();
    const sparkasseId = getAccountId("Sparkasse");
    const einkaufId = getCategoryId("Einkauf");

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'expense', '2033-01-04', '2033-01', -10000, 'EUR', ?, 'manual', ?, NULL),
          (?, NULL, 'expense', '2033-02-10', '2033-02', -30000, 'EUR', ?, 'manual', ?, NULL),
          (?, NULL, 'expense', '2033-03-11', '2033-03', -20000, 'EUR', ?, 'manual', ?, NULL)
      `,
    ).run(
      sparkasseId,
      `${PREFIX}Einkauf-Jan`,
      einkaufId,
      sparkasseId,
      `${PREFIX}Einkauf-Feb`,
      einkaufId,
      sparkasseId,
      `${PREFIX}Einkauf-Mar`,
      einkaufId,
    );

    const report = trendModule.getTrendReport("2033-01", "2033-03");
    const einkauf = report.rows.find((row) => row.categoryName === "Einkauf");

    expect(report.months).toEqual(["2033-01", "2033-02", "2033-03"]);
    expect(einkauf).toBeDefined();
    expect(einkauf?.averageSpentCents).toBe(20000);
    expect(einkauf?.currentMonthSpentCents).toBe(20000);
    expect(einkauf?.previousMonthSpentCents).toBe(30000);
    expect(einkauf?.deltaToPreviousMonthCents).toBe(-10000);
    expect(einkauf?.previousAverageSpentCents).toBe(20000);
    expect(einkauf?.deltaToPreviousAverageCents).toBe(0);

    const febPoint = einkauf?.points.find((point) => point.monthKey === "2033-02");
    expect(febPoint?.isOutlier).toBe(true);
    expect(einkauf?.outlierCount).toBe(1);
  });
});
