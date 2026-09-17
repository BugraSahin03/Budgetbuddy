import "server-only";

import { getDb } from "@/src/db/client";

export type CategoryMonthSummaryRow = {
  monthKey: string;
  categoryId: number;
  categoryName: string;
  budgetAmountCents: number | null;
  spentAmountCents: number;
  remainingAmountCents: number | null;
};

export type CategoryChartSeries = {
  categoryId: number;
  categoryName: string;
  monthlySpent: Array<{ monthKey: string; spentAmountCents: number }>;
  totalSpentCents: number;
};

export type CategoryReport = {
  monthFrom: string;
  monthTo: string;
  rows: CategoryMonthSummaryRow[];
  chartSeries: CategoryChartSeries[];
  availableMonths: string[];
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeMonthKey(monthKey: string, label: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error(`${label} muss im Format YYYY-MM vorliegen.`);
  }

  return normalized;
}

function compareMonthKeys(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function createMonthRange(monthFrom: string, monthTo: string): string[] {
  const [fromYearRaw, fromMonthRaw] = monthFrom.split("-");
  const [toYearRaw, toMonthRaw] = monthTo.split("-");

  const fromYear = Number.parseInt(fromYearRaw, 10);
  const fromMonth = Number.parseInt(fromMonthRaw, 10);
  const toYear = Number.parseInt(toYearRaw, 10);
  const toMonth = Number.parseInt(toMonthRaw, 10);

  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
  const end = new Date(Date.UTC(toYear, toMonth - 1, 1));

  const range: string[] = [];

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    range.push(`${year}-${month}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return range;
}

export function listCategoryReportAvailableMonths(): string[] {
  const dbMonths = getDb()
    .prepare(
      `
        SELECT DISTINCT monthKey
        FROM (
          SELECT month_key AS monthKey FROM monthly_category_budgets
          UNION
          SELECT month_key AS monthKey
          FROM budget_effective_entries
          WHERE transaction_type = 'expense'
            AND category_id IS NOT NULL
        )
        WHERE monthKey IS NOT NULL
          AND monthKey GLOB '????-??'
        ORDER BY monthKey ASC
      `,
    )
    .all() as Array<{ monthKey: string }>;

  if (dbMonths.length > 0) {
    return dbMonths.map((row) => row.monthKey);
  }

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return [`${now.getFullYear()}-${month}`];
}

export function getCategoryReport(monthFromInput: string, monthToInput: string): CategoryReport {
  const monthFrom = normalizeMonthKey(monthFromInput, "Startmonat");
  const monthTo = normalizeMonthKey(monthToInput, "Endmonat");

  if (compareMonthKeys(monthFrom, monthTo) > 0) {
    throw new Error("Startmonat darf nicht nach dem Endmonat liegen.");
  }

  const months = createMonthRange(monthFrom, monthTo);

  const rows = getDb()
    .prepare(
      `
        WITH month_range(monthKey) AS (
          VALUES ${months.map(() => "(?)").join(", ")}
        ),
        month_category_source AS (
          SELECT mr.monthKey, mb.category_id AS categoryId
          FROM month_range mr
          INNER JOIN monthly_category_budgets mb ON mb.month_key = mr.monthKey
          UNION
          SELECT mr.monthKey, t.category_id AS categoryId
          FROM month_range mr
          INNER JOIN budget_effective_entries t
            ON t.month_key = mr.monthKey
          WHERE t.transaction_type = 'expense'
            AND t.category_id IS NOT NULL
        )
        SELECT
          mcs.monthKey,
          c.id AS categoryId,
          c.name AS categoryName,
          mb.budget_amount_cents AS budgetAmountCents,
          COALESCE(
            (
              SELECT SUM(-t.amount_cents)
              FROM budget_effective_entries t
              WHERE t.transaction_type = 'expense'
                AND t.category_id = c.id
                AND t.month_key = mcs.monthKey
            ),
            0
          ) AS spentAmountCents
        FROM month_category_source mcs
        INNER JOIN categories c ON c.id = mcs.categoryId
        LEFT JOIN monthly_category_budgets mb
          ON mb.month_key = mcs.monthKey
         AND mb.category_id = c.id
        ORDER BY mcs.monthKey ASC, c.name COLLATE NOCASE ASC
      `,
    )
    .all(...months) as Array<{
    monthKey: string;
    categoryId: number;
    categoryName: string;
    budgetAmountCents: number | null;
    spentAmountCents: number;
  }>;

  const normalizedRows: CategoryMonthSummaryRow[] = rows.map((row) => ({
    monthKey: row.monthKey,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    budgetAmountCents: row.budgetAmountCents,
    spentAmountCents: row.spentAmountCents,
    remainingAmountCents:
      row.budgetAmountCents === null ? null : row.budgetAmountCents - row.spentAmountCents,
  }));

  const chartMap = new Map<number, CategoryChartSeries>();

  for (const row of normalizedRows) {
    const existing = chartMap.get(row.categoryId);

    if (!existing) {
      chartMap.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        monthlySpent: [{ monthKey: row.monthKey, spentAmountCents: row.spentAmountCents }],
        totalSpentCents: row.spentAmountCents,
      });
      continue;
    }

    existing.monthlySpent.push({ monthKey: row.monthKey, spentAmountCents: row.spentAmountCents });
    existing.totalSpentCents += row.spentAmountCents;
  }

  const chartSeries = [...chartMap.values()].sort((left, right) =>
    right.totalSpentCents - left.totalSpentCents || left.categoryName.localeCompare(right.categoryName, "de"),
  );

  return {
    monthFrom,
    monthTo,
    rows: normalizedRows,
    chartSeries,
    availableMonths: listCategoryReportAvailableMonths(),
  };
}
