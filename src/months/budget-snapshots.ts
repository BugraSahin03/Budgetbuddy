import "server-only";

import { getDb } from "@/src/db/client";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format YYYY-MM vorliegen.");
  }

  return normalized;
}

export function hasBudgetSnapshot(monthKey: string): boolean {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const row = getDb()
    .prepare(
      `
        SELECT budget_snapshot_created_at AS budgetSnapshotCreatedAt
        FROM monthly_statuses
        WHERE month_key = ?
      `,
    )
    .get(normalizedMonthKey) as
    | { budgetSnapshotCreatedAt: string | null }
    | undefined;

  return row?.budgetSnapshotCreatedAt !== null && row !== undefined;
}

export function insertBudgetSnapshotRows(monthKey: string): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const db = getDb();

  db.prepare(
    `
      INSERT INTO monthly_category_snapshots (
        month_key,
        category_id,
        name_snapshot,
        icon_name_snapshot,
        is_active_snapshot,
        is_visible_snapshot,
        is_savings_snapshot,
        budget_amount_cents_snapshot
      )
      SELECT
        ?,
        c.id,
        c.name,
        c.icon_name,
        c.is_active,
        1,
        CASE WHEN c.system_key = 'savings' THEN 1 ELSE 0 END,
        CASE
          WHEN c.is_active = 1
            THEN COALESCE(mb.budget_amount_cents, c.default_budget_amount_cents)
          ELSE NULL
        END
      FROM categories c
      LEFT JOIN monthly_category_budgets mb
        ON mb.month_key = ?
       AND mb.category_id = c.id
      WHERE c.is_active = 1
         OR EXISTS (
           SELECT 1
           FROM transactions t
           WHERE t.effective_month_key = ?
             AND t.transaction_type = 'expense'
             AND t.category_id = c.id
         )
      ON CONFLICT(month_key, category_id) DO NOTHING
    `,
  ).run(normalizedMonthKey, normalizedMonthKey, normalizedMonthKey);

  db.prepare(
    `
      INSERT INTO monthly_special_budget_snapshots (
        month_key,
        special_budget_id,
        project_id,
        name_snapshot,
        icon_name_snapshot,
        planned_amount_cents_snapshot,
        is_active_snapshot,
        is_visible_snapshot
      )
      SELECT
        ?,
        sb.id,
        sb.project_id,
        sb.name,
        sbp.icon_name,
        sb.planned_amount_cents,
        sb.is_active,
        CASE
          WHEN sb.is_active = 1 AND COALESCE(sbp.status, 'active') = 'active' THEN 1
          ELSE 0
        END
      FROM special_budgets sb
      LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
      WHERE sb.month_key = ?
      ON CONFLICT(month_key, special_budget_id) DO NOTHING
    `,
  ).run(normalizedMonthKey, normalizedMonthKey);
}

export function ensureCategoryBudgetSnapshot(
  monthKey: string,
  categoryId: number | null,
): void {
  if (categoryId === null) {
    return;
  }

  const normalizedMonthKey = normalizeMonthKey(monthKey);

  getDb()
    .prepare(
      `
        INSERT INTO monthly_category_snapshots (
          month_key,
          category_id,
          name_snapshot,
          icon_name_snapshot,
          is_active_snapshot,
          is_visible_snapshot,
          is_savings_snapshot,
          budget_amount_cents_snapshot
        )
        SELECT
          ?,
          c.id,
          c.name,
          c.icon_name,
          c.is_active,
          1,
          CASE WHEN c.system_key = 'savings' THEN 1 ELSE 0 END,
          COALESCE(mb.budget_amount_cents, c.default_budget_amount_cents)
        FROM categories c
        LEFT JOIN monthly_category_budgets mb
          ON mb.month_key = ?
         AND mb.category_id = c.id
        WHERE c.id = ?
          AND EXISTS (
            SELECT 1
            FROM monthly_statuses ms
            WHERE ms.month_key = ?
              AND ms.budget_snapshot_created_at IS NOT NULL
          )
        ON CONFLICT(month_key, category_id) DO NOTHING
      `,
    )
    .run(
      normalizedMonthKey,
      normalizedMonthKey,
      categoryId,
      normalizedMonthKey,
    );
}

export function ensureSpecialBudgetSnapshot(
  monthKey: string,
  specialBudgetId: number | null,
): void {
  if (specialBudgetId === null) {
    return;
  }

  const normalizedMonthKey = normalizeMonthKey(monthKey);

  getDb()
    .prepare(
      `
        INSERT INTO monthly_special_budget_snapshots (
          month_key,
          special_budget_id,
          project_id,
          name_snapshot,
          icon_name_snapshot,
          planned_amount_cents_snapshot,
          is_active_snapshot,
          is_visible_snapshot
        )
        SELECT
          ?,
          sb.id,
          sb.project_id,
          sb.name,
          sbp.icon_name,
          sb.planned_amount_cents,
          sb.is_active,
          CASE
            WHEN sb.is_active = 1 AND COALESCE(sbp.status, 'active') = 'active' THEN 1
            ELSE 0
          END
        FROM special_budgets sb
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        WHERE sb.id = ?
          AND sb.month_key = ?
          AND EXISTS (
            SELECT 1
            FROM monthly_statuses ms
            WHERE ms.month_key = ?
              AND ms.budget_snapshot_created_at IS NOT NULL
          )
        ON CONFLICT(month_key, special_budget_id) DO NOTHING
      `,
    )
    .run(
      normalizedMonthKey,
      specialBudgetId,
      normalizedMonthKey,
      normalizedMonthKey,
    );
}

export function ensureAssignedBudgetSnapshot(input: {
  monthKey: string;
  categoryId: number | null;
  specialBudgetId: number | null;
}): void {
  ensureCategoryBudgetSnapshot(input.monthKey, input.categoryId);
  ensureSpecialBudgetSnapshot(input.monthKey, input.specialBudgetId);
}
