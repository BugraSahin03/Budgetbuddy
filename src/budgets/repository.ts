import "server-only";

import { getDb } from "@/src/db/client";

export type MonthlyBudgetCategoryRow = {
  categoryId: number;
  categoryName: string;
  isCategoryActive: boolean;
  budgetAmountCents: number | null;
  spentAmountCents: number;
  remainingAmountCents: number | null;
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

export function getCurrentMonthKey(today: Date = new Date()): string {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
          mb.budget_amount_cents AS budgetAmountCents,
          COALESCE((
            SELECT SUM(-t.amount_cents)
            FROM transactions t
            WHERE t.transaction_type = 'expense'
              AND t.category_id = c.id
              AND substr(t.booking_date, 1, 7) = ?
          ), 0) AS spentAmountCents
        FROM categories c
        LEFT JOIN monthly_category_budgets mb
          ON mb.category_id = c.id
         AND mb.month_key = ?
        WHERE c.is_active = 1
           OR mb.id IS NOT NULL
        ORDER BY c.is_active DESC, c.name COLLATE NOCASE ASC
      `,
    )
    .all(normalizedMonthKey, normalizedMonthKey) as Array<{
    categoryId: number;
    categoryName: string;
    isCategoryActive: number;
    budgetAmountCents: number | null;
    spentAmountCents: number;
  }>;

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    isCategoryActive: mapSqliteBoolean(row.isCategoryActive),
    budgetAmountCents: row.budgetAmountCents,
    spentAmountCents: row.spentAmountCents,
    remainingAmountCents:
      row.budgetAmountCents === null
        ? null
        : row.budgetAmountCents - row.spentAmountCents,
  }));
}

export function setMonthlyCategoryBudget(
  monthKey: string,
  categoryId: number,
  budgetAmount: string,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedAmountCents = normalizeBudgetAmountCents(budgetAmount);

  const category = getDb()
    .prepare("SELECT id FROM categories WHERE id = ? LIMIT 1")
    .get(categoryId) as { id: number } | undefined;

  if (!category) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }

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
