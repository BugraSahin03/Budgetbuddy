import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { buildMonthRange, listMonthTimeline } = await import("@/src/months/repository");

describe("months repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("builds a gapless descending month range", () => {
    expect(buildMonthRange("2031-01", "2031-04")).toEqual([
      "2031-04",
      "2031-03",
      "2031-02",
      "2031-01",
    ]);
  });

  it("lists months from first activity until current month including gaps", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'income', '2031-01-05', '2031-01', 120000, 'EUR', 'Test Salary', 'manual', NULL, NULL)
      `,
    ).run(sparkasseId);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-03-10', '2031-03', -1200, 'EUR', 'Test Expense', 'import', NULL, NULL)
      `,
    ).run(sparkasseId);

    const months = listMonthTimeline("2031-04");

    expect(months.map((month) => month.monthKey)).toEqual([
      "2031-04",
      "2031-03",
      "2031-02",
      "2031-01",
    ]);
    expect(months.every((month) => month.detailHref === `/?month=${month.monthKey}`)).toBe(true);
    expect(months.find((month) => month.monthKey === "2031-02")?.incomeCents).toBe(0);
    expect(months.find((month) => month.monthKey === "2031-03")?.variableExpenseCents).toBe(
      1200,
    );
  });
});
