import "server-only";

import { isSavingsCategoryId } from "@/src/categories/repository";
import { getDb } from "@/src/db/client";
import {
  ensureCategoryBudgetSnapshot,
  hasBudgetSnapshot,
} from "@/src/months/budget-snapshots";
import { assertMonthIsOpen } from "@/src/months/status";

export type MonthlyBudgetCategoryRow = {
  categoryId: number;
  categoryName: string;
  categoryIconName: string | null;
  isCategoryActive: boolean;
  isSavingsCategory: boolean;
  defaultBudgetAmountCents: number | null;
  monthOverrideAmountCents: number | null;
  budgetAmountCents: number | null;
  spentAmountCents: number;
  remainingAmountCents: number | null;
};

export type CategoryBudgetDefaultRow = {
  categoryId: number;
  categoryName: string;
  isCategoryActive: boolean;
  defaultBudgetAmountCents: number | null;
  monthlyOverrideCount: number;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format YYYY-MM vorliegen.");
  }

  return normalized;
}

function normalizeBudgetAmountCents(rawAmount: string): number | null {
  const normalized = rawAmount.trim().replace(",", ".");

  if (normalized.length === 0) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Budget muss eine gueltige Zahl mit maximal zwei Nachkommastellen sein.");
  }

  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Budget muss größer oder gleich 0 sein.");
  }

  return Math.round(amount * 100);
}

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function getCategoryActivity(categoryId: number): { isActive: number } {
  const category = getDb()
    .prepare("SELECT is_active AS isActive FROM categories WHERE id = ? LIMIT 1")
    .get(categoryId) as { isActive: number } | undefined;

  if (!category) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }

  return category;
}

function assertCategoryExists(categoryId: number): void {
  getCategoryActivity(categoryId);
}

function assertCategoryIsActive(categoryId: number): void {
  if (getCategoryActivity(categoryId).isActive !== 1) {
    throw new Error(
      "Kategorie ist deaktiviert. Reaktiviere sie zuerst im Kategoriearchiv.",
    );
  }
}

function assertCategoryBudgetSnapshotIsMissing(
  monthKey: string,
  categoryId: number,
): void {
  const existingSnapshot = getDb()
    .prepare(
      `
        SELECT snapshot.id
        FROM monthly_category_snapshots snapshot
        INNER JOIN monthly_statuses status
          ON status.month_key = snapshot.month_key
        WHERE snapshot.month_key = ?
          AND snapshot.category_id = ?
          AND status.budget_snapshot_created_at IS NOT NULL
        LIMIT 1
      `,
    )
    .get(monthKey, categoryId) as { id: number } | undefined;

  if (existingSnapshot) {
    throw new Error(
      "Monatsbudget ist im vorhandenen Snapshot eingefroren und kann nicht geändert werden.",
    );
  }
}

function assertCategoryCanHavePlannedBudget(
  categoryId: number,
  normalizedAmountCents: number | null,
): void {
  if (normalizedAmountCents !== null && isSavingsCategoryId(categoryId)) {
    throw new Error("Sparen bekommt im MVP keinen Planwert.");
  }
}

export function getCurrentMonthKey(today: Date = new Date()): string {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function listCategoryBudgetDefaults(): CategoryBudgetDefaultRow[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          c.id AS categoryId,
          c.name AS categoryName,
          c.is_active AS isCategoryActive,
          c.default_budget_amount_cents AS defaultBudgetAmountCents,
          (
            SELECT COUNT(*)
            FROM monthly_category_budgets mb
            WHERE mb.category_id = c.id
          ) AS monthlyOverrideCount
        FROM categories c
        WHERE c.is_active = 1
           OR c.default_budget_amount_cents IS NOT NULL
           OR EXISTS (
             SELECT 1
             FROM monthly_category_budgets mb
             WHERE mb.category_id = c.id
           )
        ORDER BY c.is_active DESC, c.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{
    categoryId: number;
    categoryName: string;
    isCategoryActive: number;
    defaultBudgetAmountCents: number | null;
    monthlyOverrideCount: number;
  }>;

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    isCategoryActive: mapSqliteBoolean(row.isCategoryActive),
    defaultBudgetAmountCents: row.defaultBudgetAmountCents,
    monthlyOverrideCount: row.monthlyOverrideCount,
  }));
}

export function listMonthlyBudgetCategories(
  monthKey: string,
  excludedTransactionIds: readonly number[] = [],
): MonthlyBudgetCategoryRow[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const excludedTransactionFilter =
    excludedTransactionIds.length > 0
      ? `AND t.id NOT IN (${excludedTransactionIds.map(() => "?").join(", ")})`
      : "";

  if (hasBudgetSnapshot(normalizedMonthKey)) {
    const rows = getDb()
      .prepare(
        `
          SELECT
            snapshot.category_id AS categoryId,
            snapshot.name_snapshot AS categoryName,
            snapshot.icon_name_snapshot AS categoryIconName,
            snapshot.is_active_snapshot AS isCategoryActive,
            snapshot.is_savings_snapshot AS isSavingsCategory,
            NULL AS defaultBudgetAmountCents,
            snapshot.budget_amount_cents_snapshot AS monthOverrideAmountCents,
            snapshot.budget_amount_cents_snapshot AS budgetAmountCents,
            COALESCE((
              SELECT SUM(-t.amount_cents)
              FROM transactions t
              WHERE t.transaction_type = 'expense'
                AND t.category_id = snapshot.category_id
                AND t.effective_month_key = ?
                ${excludedTransactionFilter}
            ), 0) AS spentAmountCents
          FROM monthly_category_snapshots snapshot
          WHERE snapshot.month_key = ?
            AND snapshot.is_visible_snapshot = 1
          ORDER BY
            snapshot.is_active_snapshot DESC,
            snapshot.name_snapshot COLLATE NOCASE ASC
        `,
      )
      .all(
        normalizedMonthKey,
        ...excludedTransactionIds,
        normalizedMonthKey,
      ) as Array<{
      categoryId: number;
      categoryName: string;
      categoryIconName: string | null;
      isCategoryActive: number;
      isSavingsCategory: number;
      defaultBudgetAmountCents: null;
      monthOverrideAmountCents: number | null;
      budgetAmountCents: number | null;
      spentAmountCents: number;
    }>;

    return rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIconName: row.categoryIconName,
      isCategoryActive: mapSqliteBoolean(row.isCategoryActive),
      isSavingsCategory: mapSqliteBoolean(row.isSavingsCategory),
      defaultBudgetAmountCents: row.defaultBudgetAmountCents,
      monthOverrideAmountCents: row.monthOverrideAmountCents,
      budgetAmountCents: row.budgetAmountCents,
      spentAmountCents: row.spentAmountCents,
      remainingAmountCents:
        row.budgetAmountCents === null
          ? null
          : row.budgetAmountCents - row.spentAmountCents,
    }));
  }

  const rows = getDb()
    .prepare(
      `
        SELECT
          c.id AS categoryId,
          c.name AS categoryName,
          c.icon_name AS categoryIconName,
          c.is_active AS isCategoryActive,
          CASE WHEN c.system_key = 'savings' THEN 1 ELSE 0 END AS isSavingsCategory,
          CASE
            WHEN c.is_active = 1 THEN c.default_budget_amount_cents
            ELSE NULL
          END AS defaultBudgetAmountCents,
          CASE
            WHEN c.is_active = 1 THEN mb.budget_amount_cents
            ELSE NULL
          END AS monthOverrideAmountCents,
          CASE
            WHEN c.is_active = 1
              THEN COALESCE(mb.budget_amount_cents, c.default_budget_amount_cents)
            ELSE NULL
          END AS budgetAmountCents,
          COALESCE((
            SELECT SUM(-t.amount_cents)
            FROM transactions t
            WHERE t.transaction_type = 'expense'
              AND t.category_id = c.id
              AND t.effective_month_key = ?
              ${excludedTransactionFilter}
          ), 0) AS spentAmountCents
        FROM categories c
        LEFT JOIN monthly_category_budgets mb
          ON mb.category_id = c.id
         AND mb.month_key = ?
        WHERE c.is_active = 1
           OR EXISTS (
             SELECT 1
             FROM transactions historical_transaction
             WHERE historical_transaction.category_id = c.id
               AND historical_transaction.transaction_type = 'expense'
               AND historical_transaction.effective_month_key = ?
           )
        ORDER BY c.is_active DESC, c.name COLLATE NOCASE ASC
      `,
    )
    .all(
      normalizedMonthKey,
      ...excludedTransactionIds,
      normalizedMonthKey,
      normalizedMonthKey,
    ) as Array<{
    categoryId: number;
    categoryName: string;
    categoryIconName: string | null;
    isCategoryActive: number;
    isSavingsCategory: number;
    defaultBudgetAmountCents: number | null;
    monthOverrideAmountCents: number | null;
    budgetAmountCents: number | null;
    spentAmountCents: number;
  }>;

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryIconName: row.categoryIconName,
    isCategoryActive: mapSqliteBoolean(row.isCategoryActive),
    isSavingsCategory: mapSqliteBoolean(row.isSavingsCategory),
    defaultBudgetAmountCents: row.defaultBudgetAmountCents,
    monthOverrideAmountCents: row.monthOverrideAmountCents,
    budgetAmountCents: row.budgetAmountCents,
    spentAmountCents: row.spentAmountCents,
    remainingAmountCents:
      row.budgetAmountCents === null ? null : row.budgetAmountCents - row.spentAmountCents,
  }));
}

export function setCategoryDefaultBudget(categoryId: number, budgetAmount: string): void {
  assertCategoryExists(categoryId);
  const normalizedAmountCents = normalizeBudgetAmountCents(budgetAmount);
  assertCategoryCanHavePlannedBudget(categoryId, normalizedAmountCents);

  getDb()
    .prepare(
      `
        UPDATE categories
        SET
          default_budget_amount_cents = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(normalizedAmountCents, categoryId);
}

export function setMonthlyCategoryBudget(
  monthKey: string,
  categoryId: number,
  budgetAmount: string,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedAmountCents = normalizeBudgetAmountCents(budgetAmount);

  assertMonthIsOpen(normalizedMonthKey);
  assertCategoryIsActive(categoryId);
  assertCategoryCanHavePlannedBudget(categoryId, normalizedAmountCents);

  const db = getDb();
  const updateBudget = db.transaction(() => {
    assertCategoryBudgetSnapshotIsMissing(normalizedMonthKey, categoryId);

    if (normalizedAmountCents === null) {
      db.prepare(
        `
          DELETE FROM monthly_category_budgets
          WHERE month_key = ?
            AND category_id = ?
        `,
      ).run(normalizedMonthKey, categoryId);

      return;
    }

    db.prepare(
      `
          INSERT INTO monthly_category_budgets (
            month_key,
            category_id,
            budget_amount_cents,
            updated_at
          )
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(month_key, category_id)
          DO UPDATE SET
            budget_amount_cents = excluded.budget_amount_cents,
            updated_at = CURRENT_TIMESTAMP
        `,
    ).run(normalizedMonthKey, categoryId, normalizedAmountCents);

    ensureCategoryBudgetSnapshot(normalizedMonthKey, categoryId);
  });

  updateBudget();
}

export function freezeMonthlyCategoryBudgetValues(monthKey: string): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const rows = listMonthlyBudgetCategories(normalizedMonthKey).filter(
    (row) => row.budgetAmountCents !== null,
  );

  const upsertBudget = getDb().prepare(
    `
      INSERT INTO monthly_category_budgets (
        month_key,
        category_id,
        budget_amount_cents,
        updated_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(month_key, category_id)
      DO UPDATE SET
        budget_amount_cents = excluded.budget_amount_cents,
        updated_at = CURRENT_TIMESTAMP
    `,
  );

  const transaction = getDb().transaction(() => {
    for (const row of rows) {
      upsertBudget.run(
        normalizedMonthKey,
        row.categoryId,
        row.budgetAmountCents,
      );
    }
  });

  transaction();
}
