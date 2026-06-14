import "server-only";

import { isSavingsCategoryId } from "@/src/categories/repository";
import { getDb } from "@/src/db/client";
import { assertMonthIsOpen } from "@/src/months/status";

export type MonthlyBudgetCategoryRow = {
  categoryId: number;
  categoryName: string;
  isCategoryActive: boolean;
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
    throw new Error("Budget muss groesser oder gleich 0 sein.");
  }

  return Math.round(amount * 100);
}

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function assertCategoryExists(categoryId: number): void {
  const category = getDb()
    .prepare("SELECT id FROM categories WHERE id = ? LIMIT 1")
    .get(categoryId) as { id: number } | undefined;

  if (!category) {
    throw new Error("Kategorie wurde nicht gefunden.");
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

export function listMonthlyBudgetCategories(monthKey: string): MonthlyBudgetCategoryRow[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);

  const rows = getDb()
    .prepare(
      `
        SELECT
          c.id AS categoryId,
          c.name AS categoryName,
          c.is_active AS isCategoryActive,
          c.default_budget_amount_cents AS defaultBudgetAmountCents,
          mb.budget_amount_cents AS monthOverrideAmountCents,
          COALESCE(mb.budget_amount_cents, c.default_budget_amount_cents) AS budgetAmountCents,
          COALESCE((
            SELECT SUM(-t.amount_cents)
            FROM transactions t
            WHERE t.transaction_type = 'expense'
              AND t.category_id = c.id
              AND t.effective_month_key = ?
          ), 0) AS spentAmountCents
        FROM categories c
        LEFT JOIN monthly_category_budgets mb
          ON mb.category_id = c.id
         AND mb.month_key = ?
        WHERE c.is_active = 1
           OR c.default_budget_amount_cents IS NOT NULL
           OR mb.id IS NOT NULL
        ORDER BY c.is_active DESC, c.name COLLATE NOCASE ASC
      `,
    )
    .all(normalizedMonthKey, normalizedMonthKey) as Array<{
    categoryId: number;
    categoryName: string;
    isCategoryActive: number;
    defaultBudgetAmountCents: number | null;
    monthOverrideAmountCents: number | null;
    budgetAmountCents: number | null;
    spentAmountCents: number;
  }>;

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    isCategoryActive: mapSqliteBoolean(row.isCategoryActive),
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
  assertCategoryExists(categoryId);
  assertCategoryCanHavePlannedBudget(categoryId, normalizedAmountCents);

  if (normalizedAmountCents === null) {
    getDb()
      .prepare(
        `
          DELETE FROM monthly_category_budgets
          WHERE month_key = ?
            AND category_id = ?
        `,
      )
      .run(normalizedMonthKey, categoryId);

    return;
  }

  getDb()
    .prepare(
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
    )
    .run(normalizedMonthKey, categoryId, normalizedAmountCents);
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
