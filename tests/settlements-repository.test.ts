import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const {
  getMonthSnapshot,
  listMonthComparison,
  setFixedCostControlOverrideForMonth,
} = await import("@/src/months/repository");
const { getDashboardMonthSnapshot } = await import("@/src/dashboard/repository");
const { listLifetimeStats } = await import("@/src/analytics/lifetime-stats");
const { getCategoryReport } = await import("@/src/analytics/category-report");
const { getCashAccountSnapshot } = await import("@/src/transactions/repository");
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
    const transactionCountAfter = (
      db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as {
        count: number;
      }
    ).count;

    expect(before.totals.grossIncomeCents).toBe(5000);
    expect(before.totals.expenseCents).toBe(6000);
    expect(after.totals.grossIncomeCents).toBe(0);
    expect(after.totals.expenseCents).toBe(1000);
    expect(after.totals.currentBudgetCents).toBe(before.totals.currentBudgetCents);
    expect(accountMovementAfter).toBe(accountMovementBefore);
    expect(transactionCountAfter).toBe(2);
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
    expect(() =>
      db.prepare(
        `DELETE FROM transaction_settlement_members
         WHERE settlement_group_id = ? AND transaction_id = ?`,
      ).run(groupId, seeded.expenseId),
    ).toThrow(/Einzelne Buchungen/);
    const extraIncomeId = Number(
      db.prepare(
        `INSERT INTO transactions (
          account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, description, source_type
        ) VALUES (?, 'income', '2031-04-20', '2031-04', 100, 'Zusätzliche Einnahme', 'manual')`,
      ).run(seeded.accountId).lastInsertRowid,
    );
    expect(() =>
      db.prepare(
        `INSERT INTO transaction_settlement_members
         (settlement_group_id, transaction_id) VALUES (?, ?)`,
      ).run(groupId, extraIncomeId),
    ).toThrow(/fertige Verrechnung/);
    db.prepare("DELETE FROM transactions WHERE id = ?").run(extraIncomeId);
    expect(listMonthComparison("2031-04")[0]).toEqual(
      expect.objectContaining({
        monthKey: "2031-04",
        incomeCents: 0,
        expenseCents: 1000,
      }),
    );
    expect(listLifetimeStats("2031-04").totals).toEqual(
      expect.objectContaining({ incomeCents: 0, expenseCents: 1000 }),
    );
    expect(getDashboardMonthSnapshot("2031-04").openAssignmentCount).toBe(1);

    renameSettlement(groupId, "2031-04", "Teamessen final");
    const renamed = getMonthSnapshot("2031-04");
    expect(renamed.settlementGroups[0].name).toBe("Teamessen final");
    expect(renamed.totals).toEqual(after.totals);

    updateSettlementAssignment(groupId, "2031-04", {
      categoryId: seeded.categoryId,
      specialBudgetId: null,
    });
    const assigned = getMonthSnapshot("2031-04");
    expect(
      assigned.categoryRows.find((row) => row.categoryId === seeded.categoryId)?.spentAmountCents,
    ).toBe(1000);
    expect(getCategoryReport("2031-04", "2031-04").rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: seeded.categoryId,
          spentAmountCents: 1000,
        }),
      ]),
    );
    expect(getDashboardMonthSnapshot("2031-04").openAssignmentCount).toBe(0);

    expect(() =>
      db.prepare("UPDATE transactions SET description = 'Manipuliert' WHERE id = ?")
        .run(seeded.expenseId),
    ).toThrow(/Verrechnete Buchungen/);
    expect(() =>
      db.prepare("DELETE FROM transactions WHERE id = ?").run(seeded.incomeId),
    ).toThrow(/Verrechnete Buchungen/);
    expect(() =>
      setFixedCostControlOverrideForMonth(
        seeded.expenseId,
        "2031-04",
        "include",
      ),
    ).toThrow(/Verrechnete Buchungen/);
    expect(() =>
      db.prepare(
        `INSERT INTO transaction_fixed_cost_control_matches (
          transaction_id, rule_name_snapshot, rule_pattern_snapshot,
          rule_match_field_snapshot
        ) VALUES (?, 'Nachträglicher Treffer', 'AUSLAGE', 'description')`,
      ).run(seeded.expenseId),
    ).toThrow(/Verrechnete Buchungen/);

    dissolveSettlement(groupId, "2031-04");
    const restored = getMonthSnapshot("2031-04");
    expect(restored.totals.grossIncomeCents).toBe(5000);
    expect(restored.totals.expenseCents).toBe(6000);
    expect(restored.totals.currentBudgetCents).toBe(before.totals.currentBudgetCents);
    expect(getDashboardMonthSnapshot("2031-04").openAssignmentCount).toBe(0);
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

  it("keeps incomplete drafts ineffective and refuses to finalize them", () => {
    const seeded = seedOpposingBookings();
    const before = getMonthSnapshot("2031-04");
    const draftId = Number(
      db.prepare(
        `INSERT INTO transaction_settlement_groups (month_key, name, is_finalized)
         VALUES ('2031-04', 'Unvollständiger Entwurf', 0)`,
      ).run().lastInsertRowid,
    );
    db.prepare(
      `INSERT INTO transaction_settlement_members
       (settlement_group_id, transaction_id) VALUES (?, ?)`,
    ).run(draftId, seeded.expenseId);

    expect(getMonthSnapshot("2031-04").totals).toEqual(before.totals);
    expect(() =>
      db.prepare(
        `UPDATE transaction_settlement_groups
         SET is_finalized = 1 WHERE id = ?`,
      ).run(draftId),
    ).toThrow(/mindestens zwei/);
    const secondExpenseId = Number(
      db.prepare(
        `INSERT INTO transactions (
          account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, description, source_type, category_id
        ) VALUES (?, 'expense', '2031-04-14', '2031-04', -100, 'Zweite Ausgabe', 'manual', ?)`,
      ).run(seeded.accountId, seeded.categoryId).lastInsertRowid,
    );
    db.prepare(
      `INSERT INTO transaction_settlement_members
       (settlement_group_id, transaction_id) VALUES (?, ?)`,
    ).run(draftId, secondExpenseId);
    const withTwoDraftMembers = getMonthSnapshot("2031-04");
    expect(withTwoDraftMembers.totals.expenseCents).toBe(
      before.totals.expenseCents + 100,
    );
    expect(() =>
      db.prepare(
        `UPDATE transaction_settlement_groups
         SET is_finalized = 1 WHERE id = ?`,
      ).run(draftId),
    ).toThrow(/Ausgaben und Einnahmen/);
    expect(getMonthSnapshot("2031-04").totals).toEqual(withTwoDraftMembers.totals);
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
    expect(() =>
      db.prepare(
        `UPDATE transaction_settlement_groups SET category_id = ? WHERE id = ?`,
      ).run(seeded.categoryId, snapshot.settlementGroups[0].id),
    ).toThrow(/Nur negative/);

    db.prepare(
      `INSERT INTO monthly_statuses (month_key, status, closed_at)
       VALUES ('2031-04', 'closed', CURRENT_TIMESTAMP)
       ON CONFLICT(month_key) DO UPDATE SET status = 'closed', closed_at = CURRENT_TIMESTAMP`,
    ).run();
    expect(() => dissolveSettlement(snapshot.settlementGroups[0].id, "2031-04"))
      .toThrow(/abgeschlossen/);
  });

  it("can assign a negative result to a same-month special budget", () => {
    const seeded = seedOpposingBookings();
    const specialBudgetId = Number(
      db.prepare(
        `INSERT INTO special_budgets (
          name, month_key, planned_amount_cents, is_active
        ) VALUES ('Team-Auslagen', '2031-04', 5000, 1)`,
      ).run().lastInsertRowid,
    );
    const groupId = createSettlement(
      "2031-04",
      "Sonderbudget-Auslage",
      [seeded.expenseId, seeded.incomeId],
    );

    updateSettlementAssignment(groupId, "2031-04", {
      categoryId: null,
      specialBudgetId,
    });
    const assigned = getMonthSnapshot("2031-04");
    expect(
      assigned.specialBudgetRows.find((row) => row.id === specialBudgetId)
        ?.actualExpenseCents,
    ).toBe(1000);
    expect(
      assigned.categoryRows.find((row) => row.categoryId === seeded.categoryId)
        ?.spentAmountCents,
    ).toBe(0);

    dissolveSettlement(groupId, "2031-04");
    const restored = getMonthSnapshot("2031-04");
    expect(
      restored.specialBudgetRows.find((row) => row.id === specialBudgetId)
        ?.actualExpenseCents,
    ).toBe(0);
    expect(
      restored.categoryRows.find((row) => row.categoryId === seeded.categoryId)
        ?.spentAmountCents,
    ).toBe(6000);
  });

  it("rejects cross-month, savings, transfer and fixed-control sources atomically", () => {
    const seeded = seedOpposingBookings();
    const accountId = seeded.accountId;
    const cashId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as {
        id: number;
      }
    ).id;
    const savingsId = (
      db.prepare("SELECT id FROM categories WHERE system_key = 'savings'").get() as {
        id: number;
      }
    ).id;
    const insert = db.prepare(`
      INSERT INTO transactions (
        account_id, destination_account_id, transaction_type, booking_date,
        effective_month_key, amount_cents, description, source_type,
        category_id, special_budget_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, NULL)
    `);
    const otherMonthIncomeId = Number(
      insert.run(
        accountId,
        null,
        "income",
        "2031-05-01",
        "2031-05",
        1000,
        "Anderer Monat",
        null,
      ).lastInsertRowid,
    );
    const savingsExpenseId = Number(
      insert.run(
        accountId,
        null,
        "expense",
        "2031-04-15",
        "2031-04",
        -1000,
        "Sparen",
        savingsId,
      ).lastInsertRowid,
    );
    const transferId = Number(
      insert.run(
        accountId,
        cashId,
        "transfer",
        "2031-04-16",
        "2031-04",
        -1000,
        "Transfer",
        null,
      ).lastInsertRowid,
    );

    expect(() =>
      createSettlement("2031-04", "Monatsmix", [seeded.expenseId, otherMonthIncomeId]),
    ).toThrow(/demselben Monat/);
    expect(() =>
      createSettlement("2031-04", "Sparen-Mix", [savingsExpenseId, seeded.incomeId]),
    ).toThrow(/Sparen/);
    expect(() =>
      createSettlement("2031-04", "Transfer-Mix", [transferId, seeded.incomeId]),
    ).toThrow(/Transfers/);

    setFixedCostControlOverrideForMonth(
      seeded.expenseId,
      "2031-04",
      "include",
    );
    expect(() =>
      createSettlement("2031-04", "Fixkosten-Mix", [seeded.expenseId, seeded.incomeId]),
    ).toThrow(/Fixkosten/);
    expect(
      (
        db.prepare("SELECT COUNT(*) AS count FROM transaction_settlement_groups").get() as {
          count: number;
        }
      ).count,
    ).toBe(0);
  });

  it("keeps multiple settlements independent while preserving the combined budget", () => {
    const first = seedOpposingBookings();
    const insert = db.prepare(`
      INSERT INTO transactions (
        account_id, transaction_type, booking_date, effective_month_key,
        amount_cents, description, source_type, category_id
      ) VALUES (?, ?, ?, '2031-04', ?, ?, ?, ?)
    `);
    const secondExpenseId = Number(
      insert.run(
        first.accountId,
        "expense",
        "2031-04-21",
        -2000,
        "Zweite Auslage",
        "manual",
        first.categoryId,
      ).lastInsertRowid,
    );
    const secondIncomeId = Number(
      insert.run(
        first.accountId,
        "refund",
        "2031-04-22",
        2500,
        "Zweite Erstattung",
        "import",
        null,
      ).lastInsertRowid,
    );
    const before = getMonthSnapshot("2031-04");
    const firstGroupId = createSettlement(
      "2031-04",
      "Erste Gruppe",
      [first.expenseId, first.incomeId],
    );
    createSettlement(
      "2031-04",
      "Zweite Gruppe",
      [secondExpenseId, secondIncomeId],
    );

    const grouped = getMonthSnapshot("2031-04");
    expect(grouped.settlementGroups).toHaveLength(2);
    expect(grouped.totals.grossIncomeCents).toBe(500);
    expect(grouped.totals.expenseCents).toBe(1000);
    expect(grouped.totals.currentBudgetCents).toBe(
      before.totals.currentBudgetCents,
    );

    dissolveSettlement(firstGroupId, "2031-04");
    const partiallyRestored = getMonthSnapshot("2031-04");
    expect(partiallyRestored.settlementGroups).toHaveLength(1);
    expect(partiallyRestored.totals.grossIncomeCents).toBe(5500);
    expect(partiallyRestored.totals.expenseCents).toBe(6000);
    expect(partiallyRestored.totals.currentBudgetCents).toBe(
      before.totals.currentBudgetCents,
    );
  });

  it("never changes the real cash balance", () => {
    const cashId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Bargeld'").get() as {
        id: number;
      }
    ).id;
    const categoryId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Freizeit'").get() as {
        id: number;
      }
    ).id;
    const insert = db.prepare(`
      INSERT INTO transactions (
        account_id, transaction_type, booking_date, effective_month_key,
        amount_cents, description, source_type, category_id
      ) VALUES (?, ?, ?, '2031-04', ?, ?, ?, ?)
    `);
    const expenseId = Number(
      insert.run(cashId, "expense", "2031-04-23", -3000, "Bar ausgelegt", "manual", categoryId)
        .lastInsertRowid,
    );
    const refundId = Number(
      insert.run(cashId, "refund", "2031-04-24", 2500, "Bar erstattet", "manual", null)
        .lastInsertRowid,
    );
    const cashBefore = getCashAccountSnapshot().currentBalanceCents;
    const budgetBefore = getMonthSnapshot("2031-04").totals.currentBudgetCents;

    createSettlement("2031-04", "Bar-Verrechnung", [expenseId, refundId]);

    expect(getCashAccountSnapshot().currentBalanceCents).toBe(cashBefore);
    expect(getMonthSnapshot("2031-04").totals).toEqual(
      expect.objectContaining({
        expenseCents: 500,
        grossIncomeCents: 0,
        currentBudgetCents: budgetBefore,
      }),
    );
  });

  it("preserves the budget identity across a matrix of cent-exact results", () => {
    const accountId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as {
        id: number;
      }
    ).id;
    const categoryId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf'").get() as {
        id: number;
      }
    ).id;
    const cases = [
      [1, 1],
      [99, 100],
      [100, 99],
      [1234, 1234],
      [2500, 2499],
      [2499, 2500],
      [50_000, 12_345],
      [12_345, 50_000],
      [999_999, 999_998],
      [999_998, 999_999],
    ] as const;

    for (const [index, [expenseCents, refundCents]] of cases.entries()) {
      const month = `${2050 + index}-04`;
      const expenseId = Number(
        db.prepare(
          `INSERT INTO transactions (
            account_id, transaction_type, booking_date, effective_month_key,
            amount_cents, description, source_type, category_id
          ) VALUES (?, 'expense', ?, ?, ?, ?, 'manual', ?)`,
        ).run(
          accountId,
          `${month}-01`,
          month,
          -expenseCents,
          `Matrix-Ausgabe ${index}`,
          categoryId,
        ).lastInsertRowid,
      );
      const refundId = Number(
        db.prepare(
          `INSERT INTO transactions (
            account_id, transaction_type, booking_date, effective_month_key,
            amount_cents, description, source_type
          ) VALUES (?, 'refund', ?, ?, ?, ?, 'manual')`,
        ).run(
          accountId,
          `${month}-02`,
          month,
          refundCents,
          `Matrix-Erstattung ${index}`,
        ).lastInsertRowid,
      );
      const before = getMonthSnapshot(month);
      const rawBefore = (
        db.prepare(
          "SELECT SUM(amount_cents) AS total FROM transactions WHERE effective_month_key = ?",
        ).get(month) as { total: number }
      ).total;

      const groupId = createSettlement(month, `Matrix ${index}`, [expenseId, refundId]);
      const after = getMonthSnapshot(month);
      const netCents = refundCents - expenseCents;
      const rawAfter = (
        db.prepare(
          "SELECT SUM(amount_cents) AS total FROM transactions WHERE effective_month_key = ?",
        ).get(month) as { total: number }
      ).total;

      expect(after.totals.currentBudgetCents).toBe(before.totals.currentBudgetCents);
      expect(rawAfter).toBe(rawBefore);
      expect(after.totals.grossIncomeCents).toBe(Math.max(netCents, 0));
      expect(after.totals.expenseCents).toBe(Math.max(-netCents, 0));
      expect(after.settlementGroups[0].amountCents).toBe(netCents);

      dissolveSettlement(groupId, month);
      expect(getMonthSnapshot(month).totals).toEqual(before.totals);
    }
  });
});
