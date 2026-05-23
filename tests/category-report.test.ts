import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type CategoryReportModule = typeof import("@/src/analytics/category-report");

let dbClient: DbClientModule;
let reportModule: CategoryReportModule;

const PREFIX = "TEST-FIN-014-";

function cleanup(): void {
  const db = dbClient.getDb();

  db.prepare("DELETE FROM transactions WHERE description LIKE ?").run(`${PREFIX}%`);
  db.prepare("DELETE FROM monthly_category_budgets WHERE month_key IN ('2032-01', '2032-02')").run();
}

function getAccountId(name: "Sparkasse" | "Bargeld"): number {
  return (dbClient.getDb().prepare("SELECT id FROM accounts WHERE name = ?").get(name) as { id: number })
    .id;
}

function getCategoryId(name: string): number {
  return (dbClient.getDb().prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: number })
    .id;
}

beforeAll(async () => {
  dbClient = await import("@/src/db/client");
  reportModule = await import("@/src/analytics/category-report");
});

describe("category report analytics", () => {
  it("aggregates monthly category sums and compares against budgets", () => {
    cleanup();

    const db = dbClient.getDb();
    const sparkasseId = getAccountId("Sparkasse");
    const cashId = getAccountId("Bargeld");
    const einkaufId = getCategoryId("Einkauf");
    const freizeitId = getCategoryId("Freizeit");

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (month_key, category_id, budget_amount_cents)
        VALUES ('2032-01', ?, 30000), ('2032-02', ?, 25000), ('2032-01', ?, 10000)
      `,
    ).run(einkaufId, einkaufId, freizeitId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, amount_cents,
          currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'expense', '2032-01-05', -12000, 'EUR', ?, 'manual', ?, NULL),
          (?, NULL, 'expense', '2032-01-18', -4000, 'EUR', ?, 'manual', ?, NULL),
          (?, NULL, 'expense', '2032-02-03', -18000, 'EUR', ?, 'manual', ?, NULL),
          (?, NULL, 'expense', '2032-01-09', -7000, 'EUR', ?, 'manual', ?, NULL),
          (?, ?, 'transfer', '2032-01-20', -5000, 'EUR', ?, 'manual', NULL, NULL)
      `,
    ).run(
      sparkasseId,
      `${PREFIX}Einkauf-Jan-A`,
      einkaufId,
      sparkasseId,
      `${PREFIX}Einkauf-Jan-B`,
      einkaufId,
      sparkasseId,
      `${PREFIX}Einkauf-Feb`,
      einkaufId,
      sparkasseId,
      `${PREFIX}Freizeit-Jan`,
      freizeitId,
      sparkasseId,
      cashId,
      `${PREFIX}Transfer-Ignored`,
    );

    const report = reportModule.getCategoryReport("2032-01", "2032-02");

    expect(report.rows.length).toBeGreaterThanOrEqual(3);

    const einkaufJan = report.rows.find(
      (row) => row.monthKey === "2032-01" && row.categoryName === "Einkauf",
    );
    const einkaufFeb = report.rows.find(
      (row) => row.monthKey === "2032-02" && row.categoryName === "Einkauf",
    );
    const freizeitJan = report.rows.find(
      (row) => row.monthKey === "2032-01" && row.categoryName === "Freizeit",
    );

    expect(einkaufJan?.spentAmountCents).toBe(16000);
    expect(einkaufJan?.budgetAmountCents).toBe(30000);
    expect(einkaufJan?.remainingAmountCents).toBe(14000);

    expect(einkaufFeb?.spentAmountCents).toBe(18000);
    expect(einkaufFeb?.budgetAmountCents).toBe(25000);
    expect(einkaufFeb?.remainingAmountCents).toBe(7000);

    expect(freizeitJan?.spentAmountCents).toBe(7000);
    expect(freizeitJan?.budgetAmountCents).toBe(10000);
    expect(freizeitJan?.remainingAmountCents).toBe(3000);

    const einkaufSeries = report.chartSeries.find((series) => series.categoryName === "Einkauf");
    expect(einkaufSeries?.totalSpentCents).toBe(34000);
    expect(einkaufSeries?.monthlySpent).toEqual([
      { monthKey: "2032-01", spentAmountCents: 16000 },
      { monthKey: "2032-02", spentAmountCents: 18000 },
    ]);
  });

  it("rejects invalid filter range", () => {
    expect(() => reportModule.getCategoryReport("2032-03", "2032-02")).toThrow(
      "Startmonat darf nicht nach dem Endmonat liegen.",
    );
  });
});
