import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { getMonthSnapshot } = await import("@/src/months/repository");
const {
  createSettlement,
  dissolveSettlement,
  renameSettlement,
  updateSettlementAssignment,
} = await import("@/src/settlements/repository");

describe("month-scoped transaction settlements", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => db.close());

  function seedOpposingBookings() {
    const accountId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number }
    ).id;
    const categoryId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as { id: number }
    ).id;
    const insert = db.prepare(`
      INSERT INTO transactions (
        account_id, transaction_type, booking_date, effective_month_key,
        amount_cents, description, source_type, category_id
      ) VALUES (?, ?, ?, '2031-04', ?, ?, ?, ?)
    `);
    const expenseId = Number(
      insert.run(accountId, "expense", "2031-04-10", -6000, "Auslage", "manual", categoryId)
        .lastInsertRowid,
    );
    const incomeId = Number(
      insert.run(accountId, "refund", "2031-04-12", 5000, "Erstattung", "import", null)
        .lastInsertRowid,
    );
    return { accountId, categoryId, expenseId, incomeId };
  }

  it("replaces opposing KPI values by their net result without changing budget or account movement", () => {
    const seeded = seedOpposingBookings();
    const before = getMonthSnapshot("2031-04");
    const accountMovementBefore = (
      db.prepare("SELECT SUM(amount_cents) AS total FROM transactions WHERE account_id = ?")
        .get(seeded.accountId) as { total: number }
    ).total;

    const groupId = createSettlement(
      "2031-04",
      "Auslage Kollegin",
      [seeded.expenseId, seeded.incomeId],
    );
    const after = getMonthSnapshot("2031-04");
    const accountMovementAfter = (
      db.prepare("SELECT SUM(amount_cents) AS total FROM transactions WHERE account_id = ?")
        .get(seeded.accountId) as { total: number }
    ).total;

    expect(before.totals.grossIncomeCents).toBe(5000);
    expect(before.totals.expenseCents).toBe(6000);
    expect(after.totals.grossIncomeCents).toBe(0);
    expect(after.totals.expenseCents).toBe(1000);
    expect(after.totals.currentBudgetCents).toBe(before.totals.currentBudgetCents);
    expect(accountMovementAfter).toBe(accountMovementBefore);
    expect(after.settlementGroups).toEqual([
      expect.objectContaining({
        id: groupId,
        amountCents: -1000,
        memberCount: 2,
        memberTransactionIds: expect.arrayContaining([
          seeded.expenseId,
          seeded.incomeId,
        ]),
      }),
    ]);
    expect(after.transactions.every((row) => row.settlementGroupId === groupId)).toBe(true);

    renameSettlement(groupId, "2031-04", "Teamessen final");
    expect(getMonthSnapshot("2031-04").settlementGroups[0].name).toBe(
      "Teamessen final",
    );

    updateSettlementAssignment(groupId, "2031-04", {
      categoryId: seeded.categoryId,
      specialBudgetId: null,
    });
    const assigned = getMonthSnapshot("2031-04");
    expect(
      assigned.categoryRows.find((row) => row.categoryId === seeded.categoryId)?.spentAmountCents,
    ).toBe(1000);

    expect(() =>
      db.prepare("UPDATE transactions SET description = 'Manipuliert' WHERE id = ?")
        .run(seeded.expenseId),
    ).toThrow(/Verrechnete Buchungen/);

    dissolveSettlement(groupId, "2031-04");
    const restored = getMonthSnapshot("2031-04");
    expect(restored.totals.grossIncomeCents).toBe(5000);
    expect(restored.totals.expenseCents).toBe(6000);
    expect(restored.totals.currentBudgetCents).toBe(before.totals.currentBudgetCents);
  });

  it("requires both signs and prevents using one booking twice", () => {
    const seeded = seedOpposingBookings();
    expect(() =>
      createSettlement("2031-04", "Ungültig", [seeded.expenseId, seeded.expenseId]),
    ).toThrow(/mindestens zwei/);

    createSettlement("2031-04", "Erste Verrechnung", [seeded.expenseId, seeded.incomeId]);
    expect(() =>
      createSettlement("2031-04", "Zweite Verrechnung", [seeded.expenseId, seeded.incomeId]),
    ).toThrow(/bereits verrechnet/);
  });

  it("keeps a zero result visible without affecting income or expense KPIs", () => {
    const seeded = seedOpposingBookings();
    db.prepare("UPDATE transactions SET amount_cents = 6000 WHERE id = ?")
      .run(seeded.incomeId);

    createSettlement("2031-04", "Exakt ausgeglichen", [seeded.expenseId, seeded.incomeId]);
    const snapshot = getMonthSnapshot("2031-04");

    expect(snapshot.totals.grossIncomeCents).toBe(0);
    expect(snapshot.totals.expenseCents).toBe(0);
    expect(snapshot.totals.currentBudgetCents).toBe(0);
    expect(snapshot.settlementGroups[0]).toEqual(
      expect.objectContaining({ amountCents: 0, name: "Exakt ausgeglichen" }),
    );
  });

  it("turns a positive result into income and blocks changes in a closed month", () => {
    const seeded = seedOpposingBookings();
    db.prepare("UPDATE transactions SET amount_cents = 7500 WHERE id = ?")
      .run(seeded.incomeId);

    createSettlement("2031-04", "Kleine Überzahlung", [seeded.expenseId, seeded.incomeId]);
    const snapshot = getMonthSnapshot("2031-04");
    expect(snapshot.totals.grossIncomeCents).toBe(1500);
    expect(snapshot.totals.expenseCents).toBe(0);
    expect(snapshot.totals.currentBudgetCents).toBe(1500);

    db.prepare(
      `INSERT INTO monthly_statuses (month_key, status, closed_at)
       VALUES ('2031-04', 'closed', CURRENT_TIMESTAMP)
       ON CONFLICT(month_key) DO UPDATE SET status = 'closed', closed_at = CURRENT_TIMESTAMP`,
    ).run();
    expect(() => dissolveSettlement(snapshot.settlementGroups[0].id, "2031-04"))
      .toThrow(/abgeschlossen/);
  });
});
