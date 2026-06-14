import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { listLifetimeStats } = await import("@/src/analytics/lifetime-stats");

describe("lifetime stats", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("summarizes lifetime and yearly values without counting transfers", () => {
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const bargeldId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as { id: number }
    ).id;
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const savingsId = (
      db.prepare("SELECT id FROM categories WHERE system_key = 'savings'").get() as { id: number }
    ).id;

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, destination_account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, currency_code, description, source_type, category_id, special_budget_id
        ) VALUES
          (?, NULL, 'income', '2031-01-05', '2031-01', 300000, 'EUR', 'Salary 2031', 'manual', NULL, NULL),
          (?, NULL, 'refund', '2031-01-06', '2031-01', 2500, 'EUR', 'Refund 2031', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2031-01-10', '2031-01', -45000, 'EUR', 'Groceries 2031', 'manual', ?, NULL),
          (?, NULL, 'expense', '2031-01-11', '2031-01', -50000, 'EUR', 'Savings 2031', 'manual', ?, NULL),
          (?, ?, 'transfer', '2031-01-12', '2031-01', -70000, 'EUR', 'Cash transfer', 'manual', NULL, NULL),
          (?, NULL, 'income', '2032-03-05', '2032-03', 400000, 'EUR', 'Salary 2032', 'manual', NULL, NULL),
          (?, NULL, 'expense', '2032-03-10', '2032-03', -120000, 'EUR', 'Groceries 2032', 'manual', ?, NULL),
          (?, NULL, 'expense', '2032-03-11', '2032-03', -60000, 'EUR', 'Savings 2032', 'manual', ?, NULL)
      `,
    ).run(
      sparkasseId,
      sparkasseId,
      sparkasseId,
      einkaufId,
      sparkasseId,
      savingsId,
      sparkasseId,
      bargeldId,
      sparkasseId,
      sparkasseId,
      einkaufId,
      sparkasseId,
      savingsId,
    );

    const stats = listLifetimeStats();

    expect(stats.totals).toEqual({
      incomeCents: 702500,
      expenseCents: 275000,
      savingsCents: 110000,
    });
    expect(stats.years).toEqual([
      {
        year: "2032",
        incomeCents: 400000,
        expenseCents: 180000,
        savingsCents: 60000,
      },
      {
        year: "2031",
        incomeCents: 302500,
        expenseCents: 95000,
        savingsCents: 50000,
      },
    ]);
  });
});
