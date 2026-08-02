import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { closeMonth, getMonthSnapshot, getMonthStatus, reopenMonth } = await import(
  "@/src/months/repository"
);
const { setMonthlyCategoryBudget } = await import("@/src/budgets/repository");
const {
  createSpecialBudget,
  updateSpecialBudgetPlannedAmount,
} = await import("@/src/special-budgets/repository");
const {
  createManualTransaction,
  updateExpenseAssignmentForMonth,
} = await import("@/src/transactions/repository");

function getId(sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...params) as { id: number } | undefined;

  if (!row) {
    throw new Error(`Test fixture missing for query: ${sql}`);
  }

  return row.id;
}

function insertExpense(input: {
  accountId: number;
  monthKey: string;
  description: string;
  amountCents: number;
  categoryId?: number;
  specialBudgetId?: number;
  sourceType?: "manual" | "import";
}): number {
  return Number(
    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          description,
          source_type,
          category_id,
          special_budget_id
        )
        VALUES (?, 'expense', ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      input.accountId,
      `${input.monthKey}-10`,
      input.monthKey,
      input.amountCents,
      input.description,
      input.sourceType ?? "manual",
      input.categoryId ?? null,
      input.specialBudgetId ?? null,
    ).lastInsertRowid,
  );
}

describe("FIN-125 month budget snapshots", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("keeps closed category, special budget and transaction context stable while the next month stays live", () => {
    const monthKey = "2041-07";
    const accountId = getId("SELECT id FROM accounts WHERE name = 'Sparkasse'");
    const categoryId = getId("SELECT id FROM categories WHERE name = 'Einkauf'");

    db.prepare(
      `
        UPDATE categories
        SET
          name = 'Juli Einkauf',
          icon_name = 'JE',
          default_budget_amount_cents = 25000,
          is_active = 1
        WHERE id = ?
      `,
    ).run(categoryId);
    const projectId = Number(
      db.prepare(
        `
          INSERT INTO special_budget_projects (name, status, icon_name)
          VALUES ('Juli Reise', 'active', 'JR')
        `,
      ).run().lastInsertRowid,
    );
    const specialBudgetId = Number(
      db.prepare(
        `
          INSERT INTO special_budgets (
            project_id, name, month_key, planned_amount_cents, is_active
          ) VALUES (?, 'Juli Reise', ?, 50000, 1)
        `,
      ).run(projectId, monthKey).lastInsertRowid,
    );

    db.prepare(
      `
        INSERT INTO transactions (
          account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, description, source_type
        ) VALUES (?, 'income', '2041-07-01', ?, 200000, 'Gehalt', 'manual')
      `,
    ).run(accountId, monthKey);
    insertExpense({
      accountId,
      monthKey,
      description: "Juli Supermarkt",
      amountCents: -8000,
      categoryId,
    });
    insertExpense({
      accountId,
      monthKey,
      description: "Juli Hotel",
      amountCents: -12000,
      specialBudgetId,
    });

    const closedStatus = closeMonth(monthKey);
    const closedBeforeMaintenance = getMonthSnapshot(monthKey);

    expect(closedStatus).toMatchObject({
      status: "closed",
      hasBudgetSnapshot: true,
    });
    expect(
      closedBeforeMaintenance.categoryRows.find((row) => row.categoryId === categoryId),
    ).toMatchObject({
      categoryName: "Juli Einkauf",
      categoryIconName: "JE",
      budgetAmountCents: 25000,
      spentAmountCents: 8000,
      remainingAmountCents: 17000,
    });
    expect(
      closedBeforeMaintenance.specialBudgetRows.find(
        (row) => row.id === specialBudgetId,
      ),
    ).toMatchObject({
      name: "Juli Reise",
      iconName: "JR",
      plannedAmountCents: 50000,
      actualExpenseCents: 12000,
      remainingAmountCents: 38000,
      isActive: true,
    });
    expect(closedBeforeMaintenance.planSummary).toMatchObject({
      plannedCategoryBudgetCents: 25000,
      plannedSpecialBudgetCents: 50000,
      planRestAfterBudgetPotsCents: 125000,
    });

    db.prepare(
      `
        UPDATE categories
        SET name = 'August Einkauf', icon_name = 'AE', default_budget_amount_cents = 99000
        WHERE id = ?
      `,
    ).run(categoryId);
    db.prepare(
      `
        UPDATE special_budget_projects
        SET name = 'August Reise', icon_name = 'AR'
        WHERE id = ?
      `,
    ).run(projectId);
    db.prepare(
      `
        UPDATE special_budgets
        SET name = 'August Reise', planned_amount_cents = 88000
        WHERE id = ?
      `,
    ).run(specialBudgetId);
    const augustSpecialBudgetId = Number(
      db.prepare(
        `
          INSERT INTO special_budgets (
            project_id, name, month_key, planned_amount_cents, is_active
          ) VALUES (?, 'August Reise', '2041-08', 88000, 1)
        `,
      ).run(projectId).lastInsertRowid,
    );

    const closedAfterMaintenance = getMonthSnapshot(monthKey);
    const openAugust = getMonthSnapshot("2041-08");

    expect(
      closedAfterMaintenance.categoryRows.find((row) => row.categoryId === categoryId),
    ).toMatchObject({
      categoryName: "Juli Einkauf",
      categoryIconName: "JE",
      budgetAmountCents: 25000,
    });
    expect(
      closedAfterMaintenance.specialBudgetRows.find(
        (row) => row.id === specialBudgetId,
      ),
    ).toMatchObject({
      name: "Juli Reise",
      iconName: "JR",
      plannedAmountCents: 50000,
    });
    expect(
      closedAfterMaintenance.transactions.find(
        (row) => row.description === "Juli Supermarkt",
      ),
    ).toMatchObject({
      categoryName: "Juli Einkauf",
      categoryIconName: "JE",
    });
    expect(
      closedAfterMaintenance.transactions.find(
        (row) => row.description === "Juli Hotel",
      ),
    ).toMatchObject({
      specialBudgetName: "Juli Reise",
      specialBudgetIconName: "JR",
    });
    expect(openAugust.categoryRows.find((row) => row.categoryId === categoryId)).toMatchObject({
      categoryName: "August Einkauf",
      categoryIconName: "AE",
      budgetAmountCents: 99000,
    });
    expect(
      openAugust.specialBudgetRows.find((row) => row.id === augustSpecialBudgetId),
    ).toMatchObject({
      name: "August Reise",
      iconName: "AR",
      plannedAmountCents: 88000,
      isActive: true,
    });

    db.prepare(
      `
        UPDATE categories
        SET is_active = 0, default_budget_amount_cents = NULL
        WHERE id = ?
      `,
    ).run(categoryId);
    db.prepare(
      "UPDATE special_budget_projects SET status = 'archived' WHERE id = ?",
    ).run(projectId);
    closeMonth(monthKey);

    const closedAfterArchive = getMonthSnapshot(monthKey);
    const openAfterArchive = getMonthSnapshot("2041-08");

    expect(
      closedAfterArchive.categoryRows.find((row) => row.categoryId === categoryId),
    ).toMatchObject({ categoryName: "Juli Einkauf", isCategoryActive: true });
    expect(
      closedAfterArchive.specialBudgetRows.find((row) => row.id === specialBudgetId),
    ).toMatchObject({ name: "Juli Reise", isActive: true });
    expect(
      openAfterArchive.categoryRows.some((row) => row.categoryId === categoryId),
    ).toBe(false);
    expect(
      openAfterArchive.specialBudgetRows.find((row) => row.id === augustSpecialBudgetId)
        ?.isActive,
    ).toBe(false);
  });

  it("adds only missing snapshots for conscious corrections after reopening", () => {
    const monthKey = "2042-03";
    const accountId = getId("SELECT id FROM accounts WHERE name = 'Sparkasse'");
    const originalCategoryId = getId(
      "SELECT id FROM categories WHERE name = 'Freizeit'",
    );

    db.prepare(
      "UPDATE categories SET name = 'Damals Freizeit', icon_name = 'DF' WHERE id = ?",
    ).run(originalCategoryId);
    insertExpense({
      accountId,
      monthKey,
      description: "Bestehende Ausgabe",
      amountCents: -1500,
      categoryId: originalCategoryId,
    });
    closeMonth(monthKey);
    reopenMonth(monthKey);

    db.prepare(
      "UPDATE categories SET name = 'Heute Freizeit', icon_name = 'HF' WHERE id = ?",
    ).run(originalCategoryId);
    const newCategoryId = Number(
      db.prepare(
        `
          INSERT INTO categories (
            name, color_hex, icon_name, is_default, is_active, default_budget_amount_cents
          ) VALUES ('Korrektur Neu', '#123456', 'KN', 0, 1, 7000)
        `,
      ).run().lastInsertRowid,
    );

    createManualTransaction({
      bookingDate: "2042-03-15",
      effectiveMonthKey: monthKey,
      description: "Neue Korrekturausgabe",
      transactionType: "expense",
      amountInput: "23.00",
      accountId,
      destinationAccountId: null,
      categoryId: newCategoryId,
      specialBudgetId: null,
    });
    createSpecialBudget({
      name: "Korrektur Projekt",
      monthKey,
      plannedAmountCents: 11000,
      note: "Nach Wiederöffnung ergänzt",
      iconName: "KP",
    });
    const newSpecialBudgetId = getId(
      "SELECT id FROM special_budgets WHERE name = 'Korrektur Projekt' AND month_key = ?",
      monthKey,
    );
    const importedTransactionId = insertExpense({
      accountId,
      monthKey,
      description: "Importierte Korrektur",
      amountCents: -900,
      sourceType: "import",
    });
    const importedCategoryId = Number(
      db.prepare(
        `
          INSERT INTO categories (name, color_hex, icon_name, is_default, is_active)
          VALUES ('Import Korrektur', '#654321', 'IK', 0, 1)
        `,
      ).run().lastInsertRowid,
    );

    updateExpenseAssignmentForMonth(importedTransactionId, monthKey, {
      categoryId: importedCategoryId,
      specialBudgetId: null,
    });

    expect(
      db.prepare(
        `
          SELECT name_snapshot AS name, icon_name_snapshot AS iconName
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, originalCategoryId),
    ).toEqual({ name: "Damals Freizeit", iconName: "DF" });
    expect(
      db.prepare(
        `
          SELECT name_snapshot AS name, icon_name_snapshot AS iconName,
                 budget_amount_cents_snapshot AS budgetAmountCents
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, newCategoryId),
    ).toEqual({ name: "Korrektur Neu", iconName: "KN", budgetAmountCents: 7000 });
    expect(
      db.prepare(
        `
          SELECT name_snapshot AS name, icon_name_snapshot AS iconName
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, importedCategoryId),
    ).toEqual({ name: "Import Korrektur", iconName: "IK" });
    expect(
      db.prepare(
        `
          SELECT name_snapshot AS name, icon_name_snapshot AS iconName,
                 planned_amount_cents_snapshot AS plannedAmountCents
          FROM monthly_special_budget_snapshots
          WHERE month_key = ? AND special_budget_id = ?
        `,
      ).get(monthKey, newSpecialBudgetId),
    ).toEqual({
      name: "Korrektur Projekt",
      iconName: "KP",
      plannedAmountCents: 11000,
    });

    db.prepare(
      `
        UPDATE categories
        SET name = 'Korrektur Spaeter', icon_name = 'KS', default_budget_amount_cents = 17000
        WHERE id = ?
      `,
    ).run(newCategoryId);
    db.prepare(
      `
        UPDATE special_budget_projects
        SET icon_name = 'SP'
        WHERE id = (SELECT project_id FROM special_budgets WHERE id = ?)
      `,
    ).run(newSpecialBudgetId);
    db.prepare(
      "UPDATE special_budgets SET name = 'Projekt Spaeter' WHERE id = ?",
    ).run(newSpecialBudgetId);
    setMonthlyCategoryBudget(monthKey, newCategoryId, "170.00");
    updateSpecialBudgetPlannedAmount(newSpecialBudgetId, 21000);

    const reopenedSnapshot = getMonthSnapshot(monthKey);

    expect(getMonthStatus(monthKey)).toMatchObject({
      status: "open",
      hasBudgetSnapshot: true,
    });
    expect(
      reopenedSnapshot.categoryRows.find((row) => row.categoryId === originalCategoryId),
    ).toMatchObject({ categoryName: "Damals Freizeit", categoryIconName: "DF" });
    expect(
      reopenedSnapshot.categoryRows.find((row) => row.categoryId === newCategoryId),
    ).toMatchObject({
      categoryName: "Korrektur Neu",
      categoryIconName: "KN",
      budgetAmountCents: 7000,
      spentAmountCents: 2300,
    });
    expect(
      reopenedSnapshot.specialBudgetRows.find((row) => row.id === newSpecialBudgetId),
    ).toMatchObject({
      name: "Korrektur Projekt",
      iconName: "KP",
      plannedAmountCents: 11000,
    });
    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id IN (?, ?)
        `,
      ).get(monthKey, originalCategoryId, newCategoryId),
    ).toEqual({ count: 2 });
  });

  it("rolls back status and plan freezing when snapshot creation fails", () => {
    const categoryId = getId("SELECT id FROM categories WHERE name = 'Einkauf'");

    db.prepare(
      "UPDATE categories SET default_budget_amount_cents = 12300 WHERE id = ?",
    ).run(categoryId);
    db.prepare(
      `
        INSERT INTO categories (name, color_hex, icon_name, is_default, is_active)
        VALUES (' ', '#000000', 'X', 0, 1)
      `,
    ).run();

    expect(() => closeMonth("2043-01")).toThrow();
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM monthly_statuses WHERE month_key = '2043-01'",
      ).get(),
    ).toEqual({ count: 0 });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM monthly_category_budgets WHERE month_key = '2043-01'",
      ).get(),
    ).toEqual({ count: 0 });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM monthly_fixed_cost_snapshots WHERE month_key = '2043-01'",
      ).get(),
    ).toEqual({ count: 0 });
  });

  it("marks an intentionally empty snapshot and never falls back to later live categories", () => {
    db.exec(`
      UPDATE categories
      SET is_active = 0, default_budget_amount_cents = NULL;
    `);

    closeMonth("2043-02");

    expect(getMonthStatus("2043-02")).toMatchObject({
      status: "closed",
      hasBudgetSnapshot: true,
    });
    expect(getMonthSnapshot("2043-02").categoryRows).toEqual([]);
    expect(getMonthSnapshot("2043-02").specialBudgetRows).toEqual([]);

    db.prepare(
      `
        UPDATE categories
        SET is_active = 1, name = 'Spaeter sichtbar'
        WHERE id = (SELECT MIN(id) FROM categories)
      `,
    ).run();

    expect(getMonthSnapshot("2043-02").categoryRows).toEqual([]);
  });

  it("rolls back a corrected transaction when its missing snapshot cannot be inserted", () => {
    const monthKey = "2043-03";
    const accountId = getId("SELECT id FROM accounts WHERE name = 'Sparkasse'");

    closeMonth(monthKey);
    reopenMonth(monthKey);

    const invalidCategoryId = Number(
      db.prepare(
        `
          INSERT INTO categories (name, color_hex, icon_name, is_default, is_active)
          VALUES (' ', '#000000', 'X', 0, 1)
        `,
      ).run().lastInsertRowid,
    );

    expect(() =>
      createManualTransaction({
        bookingDate: "2043-03-12",
        effectiveMonthKey: monthKey,
        description: "Soll atomar scheitern",
        transactionType: "expense",
        amountInput: "12.00",
        accountId,
        destinationAccountId: null,
        categoryId: invalidCategoryId,
        specialBudgetId: null,
      }),
    ).toThrow();
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM transactions WHERE description = 'Soll atomar scheitern'",
      ).get(),
    ).toEqual({ count: 0 });
    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, invalidCategoryId),
    ).toEqual({ count: 0 });
  });
});
