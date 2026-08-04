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
  setSpecialBudgetActive,
  updateSpecialBudgetPlannedAmount,
  updateSpecialBudgetProject,
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
        SET is_active = 0
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

  it("blocks closed and reopened amount changes for an existing special budget snapshot without mutating either source", () => {
    const monthKey = "2041-09";

    createSpecialBudget({
      name: "Snapshot Reisebetrag",
      monthKey,
      plannedAmountCents: 15000,
      note: "",
    });
    const specialBudgetId = getId(
      "SELECT id FROM special_budgets WHERE name = 'Snapshot Reisebetrag'",
    );

    updateSpecialBudgetPlannedAmount(specialBudgetId, 16000);
    expect(
      db.prepare(
        "SELECT planned_amount_cents AS amount FROM special_budgets WHERE id = ?",
      ).get(specialBudgetId),
    ).toEqual({ amount: 16000 });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM monthly_special_budget_snapshots WHERE month_key = ? AND special_budget_id = ?",
      ).get(monthKey, specialBudgetId),
    ).toEqual({ count: 0 });

    closeMonth(monthKey);
    expect(() =>
      updateSpecialBudgetPlannedAmount(specialBudgetId, 17000),
    ).toThrow("Monat ist abgeschlossen");

    reopenMonth(monthKey);
    expect(() =>
      updateSpecialBudgetPlannedAmount(specialBudgetId, 18000),
    ).toThrow("im vorhandenen Monats-Snapshot eingefroren");

    expect(
      db.prepare(
        "SELECT planned_amount_cents AS amount FROM special_budgets WHERE id = ?",
      ).get(specialBudgetId),
    ).toEqual({ amount: 16000 });
    expect(
      db.prepare(
        `
          SELECT planned_amount_cents_snapshot AS amount
          FROM monthly_special_budget_snapshots
          WHERE month_key = ? AND special_budget_id = ?
        `,
      ).get(monthKey, specialBudgetId),
    ).toEqual({ amount: 16000 });
  });

  it("blocks state changes for an existing special budget snapshot without changing its project", () => {
    const monthKey = "2041-10";

    createSpecialBudget({
      name: "Snapshot Reisestatus",
      monthKey,
      plannedAmountCents: 22000,
      note: "",
    });
    const specialBudgetId = getId(
      "SELECT id FROM special_budgets WHERE name = 'Snapshot Reisestatus'",
    );
    const projectId = getId(
      "SELECT project_id AS id FROM special_budgets WHERE id = ?",
      specialBudgetId,
    );

    closeMonth(monthKey);
    reopenMonth(monthKey);

    expect(() => setSpecialBudgetActive(specialBudgetId, false)).toThrow(
      "im vorhandenen Monats-Snapshot eingefroren",
    );
    expect(
      db.prepare(
        "SELECT is_active AS isActive FROM special_budgets WHERE id = ?",
      ).get(specialBudgetId),
    ).toEqual({ isActive: 1 });
    expect(
      db.prepare(
        "SELECT status FROM special_budget_projects WHERE id = ?",
      ).get(projectId),
    ).toEqual({ status: "active" });
    expect(
      db.prepare(
        `
          SELECT
            is_active_snapshot AS isActive,
            is_visible_snapshot AS isVisible
          FROM monthly_special_budget_snapshots
          WHERE month_key = ? AND special_budget_id = ?
        `,
      ).get(monthKey, specialBudgetId),
    ).toEqual({ isActive: 1, isVisible: 1 });
  });

  it("adds a missing special budget snapshot exactly once on first use and freezes later changes", () => {
    const monthKey = "2041-11";

    closeMonth(monthKey);
    reopenMonth(monthKey);

    const projectId = Number(
      db.prepare(
        `
          INSERT INTO special_budget_projects (name, status, icon_name)
          VALUES ('Neue Snapshot-Reise', 'active', 'NR')
        `,
      ).run().lastInsertRowid,
    );
    const specialBudgetId = Number(
      db.prepare(
        `
          INSERT INTO special_budgets (
            project_id, name, month_key, planned_amount_cents, is_active
          ) VALUES (?, 'Neue Snapshot-Reise', ?, 19000, 1)
        `,
      ).run(projectId, monthKey).lastInsertRowid,
    );

    updateSpecialBudgetPlannedAmount(specialBudgetId, 23000);

    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count,
                 MAX(planned_amount_cents_snapshot) AS amount
          FROM monthly_special_budget_snapshots
          WHERE month_key = ? AND special_budget_id = ?
        `,
      ).get(monthKey, specialBudgetId),
    ).toEqual({ count: 1, amount: 23000 });

    expect(() =>
      updateSpecialBudgetPlannedAmount(specialBudgetId, 31000),
    ).toThrow("im vorhandenen Monats-Snapshot eingefroren");
    expect(() => setSpecialBudgetActive(specialBudgetId, false)).toThrow(
      "im vorhandenen Monats-Snapshot eingefroren",
    );

    expect(
      db.prepare(
        "SELECT planned_amount_cents AS amount, is_active AS isActive FROM special_budgets WHERE id = ?",
      ).get(specialBudgetId),
    ).toEqual({ amount: 23000, isActive: 1 });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM monthly_special_budget_snapshots WHERE month_key = ? AND special_budget_id = ?",
      ).get(monthKey, specialBudgetId),
    ).toEqual({ count: 1 });
  });

  it("rolls back missing special budget first use when snapshot insertion fails", () => {
    const monthKey = "2041-12";

    closeMonth(monthKey);
    reopenMonth(monthKey);

    const projectId = Number(
      db.prepare(
        "INSERT INTO special_budget_projects (name, status) VALUES ('Ungueltige Snapshot-Reise', 'active')",
      ).run().lastInsertRowid,
    );
    const specialBudgetId = Number(
      db.prepare(
        `
          INSERT INTO special_budgets (
            project_id, name, month_key, planned_amount_cents, is_active
          ) VALUES (?, ' ', ?, 14000, 1)
        `,
      ).run(projectId, monthKey).lastInsertRowid,
    );

    expect(() =>
      updateSpecialBudgetPlannedAmount(specialBudgetId, 27000),
    ).toThrow();
    expect(
      db.prepare(
        "SELECT planned_amount_cents AS amount FROM special_budgets WHERE id = ?",
      ).get(specialBudgetId),
    ).toEqual({ amount: 14000 });
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM monthly_special_budget_snapshots WHERE month_key = ? AND special_budget_id = ?",
      ).get(monthKey, specialBudgetId),
    ).toEqual({ count: 0 });
  });

  it("lets project maintenance passively retain closed shares while changing live shares atomically", () => {
    const historicalMonthKey = "2042-01";
    const liveMonthKey = "2042-02";

    createSpecialBudget({
      name: "Mehrmonatige Snapshot-Reise",
      monthKey: historicalMonthKey,
      plannedAmountCents: 30000,
      note: "",
      iconName: "MR",
    });
    createSpecialBudget({
      name: "Mehrmonatige Snapshot-Reise",
      monthKey: liveMonthKey,
      plannedAmountCents: 40000,
      note: "",
      iconName: "MR",
    });
    const shares = db.prepare(
      `
        SELECT id, project_id AS projectId, month_key AS monthKey,
               planned_amount_cents AS plannedAmountCents
        FROM special_budgets
        WHERE name = 'Mehrmonatige Snapshot-Reise'
        ORDER BY month_key
      `,
    ).all() as Array<{
      id: number;
      projectId: number;
      monthKey: string;
      plannedAmountCents: number;
    }>;
    const historicalShare = shares[0];
    const liveShare = shares[1];

    closeMonth(historicalMonthKey);

    updateSpecialBudgetProject({
      projectId: historicalShare.projectId,
      iconName: "OK",
      shares: [
        { id: historicalShare.id, plannedAmountCents: 30000 },
        { id: liveShare.id, plannedAmountCents: 45000 },
      ],
    });

    expect(() =>
      updateSpecialBudgetProject({
        projectId: historicalShare.projectId,
        iconName: "NO",
        shares: [
          { id: historicalShare.id, plannedAmountCents: 35000 },
          { id: liveShare.id, plannedAmountCents: 50000 },
        ],
      }),
    ).toThrow("Monat ist abgeschlossen");

    expect(
      db.prepare(
        "SELECT icon_name AS iconName FROM special_budget_projects WHERE id = ?",
      ).get(historicalShare.projectId),
    ).toEqual({ iconName: "OK" });
    expect(
      db.prepare(
        "SELECT planned_amount_cents AS amount FROM special_budgets WHERE id = ?",
      ).get(historicalShare.id),
    ).toEqual({ amount: 30000 });
    expect(
      db.prepare(
        "SELECT planned_amount_cents AS amount FROM special_budgets WHERE id = ?",
      ).get(liveShare.id),
    ).toEqual({ amount: 45000 });
    expect(
      db.prepare(
        `
          SELECT planned_amount_cents_snapshot AS amount
          FROM monthly_special_budget_snapshots
          WHERE month_key = ? AND special_budget_id = ?
        `,
      ).get(historicalMonthKey, historicalShare.id),
    ).toEqual({ amount: 30000 });
  });

  it("freezes the live visibility of categories that were already inactive at first close", () => {
    const monthKey = "2041-09";
    const accountId = getId("SELECT id FROM accounts WHERE name = 'Sparkasse'");
    const booklessCategoryId = getId(
      "SELECT id FROM categories WHERE name = 'Einkauf'",
    );
    const bookedCategoryId = getId(
      "SELECT id FROM categories WHERE name = 'Freizeit'",
    );

    db.prepare(
      `
        UPDATE categories
        SET is_active = 0, default_budget_amount_cents = 30000
        WHERE id = ?
      `,
    ).run(booklessCategoryId);
    db.prepare(
      `
        UPDATE categories
        SET is_active = 0, default_budget_amount_cents = 20000
        WHERE id = ?
      `,
    ).run(bookedCategoryId);
    db.prepare(
      `
        INSERT INTO monthly_category_budgets (
          month_key, category_id, budget_amount_cents
        ) VALUES (?, ?, 40000), (?, ?, 15000)
      `,
    ).run(
      monthKey,
      booklessCategoryId,
      monthKey,
      bookedCategoryId,
    );
    insertExpense({
      accountId,
      monthKey,
      description: "Historisch zugeordnet",
      amountCents: -2500,
      categoryId: bookedCategoryId,
    });

    closeMonth(monthKey);

    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, booklessCategoryId),
    ).toEqual({ count: 0 });
    expect(
      getMonthSnapshot(monthKey).categoryRows.find(
        (row) => row.categoryId === bookedCategoryId,
      ),
    ).toMatchObject({
      isCategoryActive: false,
      budgetAmountCents: null,
      spentAmountCents: 2500,
      remainingAmountCents: null,
    });

    reopenMonth(monthKey);
    db.prepare(
      `
        UPDATE categories
        SET is_active = 1, name = 'Heute Freizeit', default_budget_amount_cents = 99000
        WHERE id = ?
      `,
    ).run(bookedCategoryId);

    expect(() =>
      setMonthlyCategoryBudget(monthKey, bookedCategoryId, "99.00"),
    ).toThrow("im vorhandenen Snapshot eingefroren");
    expect(
      db.prepare(
        `
          SELECT budget_amount_cents AS budgetAmountCents
          FROM monthly_category_budgets
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, bookedCategoryId),
    ).toEqual({ budgetAmountCents: 15000 });

    expect(
      getMonthSnapshot(monthKey).categoryRows.find(
        (row) => row.categoryId === bookedCategoryId,
      ),
    ).toMatchObject({
      categoryName: "Freizeit",
      isCategoryActive: false,
      budgetAmountCents: null,
      spentAmountCents: 2500,
    });
  });

  it("ignores an empty first use before adding one missing category snapshot", () => {
    const monthKey = "2041-10";

    closeMonth(monthKey);
    reopenMonth(monthKey);

    const categoryId = Number(
      db.prepare(
        `
          INSERT INTO categories (
            name, color_hex, icon_name, is_default, is_active, default_budget_amount_cents
          ) VALUES ('Neue Plankorrektur', '#123456', 'NP', 0, 1, NULL)
        `,
      ).run().lastInsertRowid,
    );

    setMonthlyCategoryBudget(monthKey, categoryId, "");

    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_budgets
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, categoryId),
    ).toEqual({ count: 0 });
    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, categoryId),
    ).toEqual({ count: 0 });
    expect(
      db.prepare(
        `
          SELECT default_budget_amount_cents AS defaultBudgetAmountCents
          FROM categories
          WHERE id = ?
        `,
      ).get(categoryId),
    ).toEqual({ defaultBudgetAmountCents: null });

    setMonthlyCategoryBudget(monthKey, categoryId, "44.00");

    expect(
      db.prepare(
        `
          SELECT budget_amount_cents AS budgetAmountCents
          FROM monthly_category_budgets
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, categoryId),
    ).toEqual({ budgetAmountCents: 4400 });
    expect(
      db.prepare(
        `
          SELECT budget_amount_cents_snapshot AS budgetAmountCents
          FROM monthly_category_snapshots
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, categoryId),
    ).toEqual({ budgetAmountCents: 4400 });

    expect(() =>
      setMonthlyCategoryBudget(monthKey, categoryId, "55.00"),
    ).toThrow("im vorhandenen Snapshot eingefroren");
    expect(
      db.prepare(
        `
          SELECT budget_amount_cents AS budgetAmountCents
          FROM monthly_category_budgets
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, categoryId),
    ).toEqual({ budgetAmountCents: 4400 });
    expect(
      getMonthSnapshot(monthKey).categoryRows.find(
        (row) => row.categoryId === categoryId,
      ),
    ).toMatchObject({
      categoryName: "Neue Plankorrektur",
      budgetAmountCents: 4400,
    });
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
    expect(() =>
      setMonthlyCategoryBudget(monthKey, newCategoryId, "170.00"),
    ).toThrow("im vorhandenen Snapshot eingefroren");
    expect(() =>
      updateSpecialBudgetPlannedAmount(newSpecialBudgetId, 21000),
    ).toThrow("im vorhandenen Monats-Snapshot eingefroren");

    expect(
      db.prepare(
        `
          SELECT COUNT(*) AS count
          FROM monthly_category_budgets
          WHERE month_key = ? AND category_id = ?
        `,
      ).get(monthKey, newCategoryId),
    ).toEqual({ count: 0 });
    expect(
      db.prepare(
        `
          SELECT planned_amount_cents AS plannedAmountCents
          FROM special_budgets
          WHERE id = ?
        `,
      ).get(newSpecialBudgetId),
    ).toEqual({ plannedAmountCents: 11000 });

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
