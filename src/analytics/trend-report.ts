import "server-only";

import { getCategoryReport, listCategoryReportAvailableMonths } from "@/src/analytics/category-report";

export type CategoryTrendPoint = {
  monthKey: string;
  spentAmountCents: number;
  isOutlier: boolean;
};

export type CategoryTrendRow = {
  categoryId: number;
  categoryName: string;
  averageSpentCents: number;
  currentMonthSpentCents: number;
  previousMonthSpentCents: number | null;
  previousAverageSpentCents: number | null;
  deltaToPreviousMonthCents: number | null;
  deltaToPreviousAverageCents: number | null;
  outlierCount: number;
  points: CategoryTrendPoint[];
};

export type TrendReport = {
  monthFrom: string;
  monthTo: string;
  months: string[];
  rows: CategoryTrendRow[];
  availableMonths: string[];
};

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

function getPreviousMonthKey(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);

  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);

  const prevYear = date.getUTCFullYear();
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${prevYear}-${prevMonth}`;
}

export function getTrendReport(monthFrom: string, monthTo: string): TrendReport {
  const categoryReport = getCategoryReport(monthFrom, monthTo);
  const months = createMonthRange(categoryReport.monthFrom, categoryReport.monthTo);

  const categoryNames = new Map<number, string>();
  const spentByCategoryMonth = new Map<string, number>();

  for (const row of categoryReport.rows) {
    categoryNames.set(row.categoryId, row.categoryName);
    spentByCategoryMonth.set(`${row.categoryId}-${row.monthKey}`, row.spentAmountCents);
  }

  const previousMonthKey = getPreviousMonthKey(categoryReport.monthTo);
  const rows: CategoryTrendRow[] = [];

  for (const [categoryId, categoryName] of categoryNames.entries()) {
    const monthlyValues = months.map((monthKey) => ({
      monthKey,
      spentAmountCents: spentByCategoryMonth.get(`${categoryId}-${monthKey}`) ?? 0,
    }));

    const totalSpent = monthlyValues.reduce((sum, entry) => sum + entry.spentAmountCents, 0);
    const averageSpentCents = Math.round(totalSpent / Math.max(monthlyValues.length, 1));

    const points = monthlyValues.map((entry) => ({
      ...entry,
      isOutlier:
        monthlyValues.length > 1 &&
        averageSpentCents > 0 &&
        entry.spentAmountCents >= Math.round(averageSpentCents * 1.5),
    }));

    const currentMonthSpentCents =
      monthlyValues.find((entry) => entry.monthKey === categoryReport.monthTo)?.spentAmountCents ?? 0;

    const previousMonthSpentCents = months.includes(previousMonthKey)
      ? monthlyValues.find((entry) => entry.monthKey === previousMonthKey)?.spentAmountCents ?? 0
      : null;

    const monthsBeforeCurrent = monthlyValues.filter((entry) => entry.monthKey !== categoryReport.monthTo);
    const previousAverageSpentCents =
      monthsBeforeCurrent.length === 0
        ? null
        : Math.round(
            monthsBeforeCurrent.reduce((sum, entry) => sum + entry.spentAmountCents, 0) /
              monthsBeforeCurrent.length,
          );

    rows.push({
      categoryId,
      categoryName,
      averageSpentCents,
      currentMonthSpentCents,
      previousMonthSpentCents,
      previousAverageSpentCents,
      deltaToPreviousMonthCents:
        previousMonthSpentCents === null ? null : currentMonthSpentCents - previousMonthSpentCents,
      deltaToPreviousAverageCents:
        previousAverageSpentCents === null ? null : currentMonthSpentCents - previousAverageSpentCents,
      outlierCount: points.filter((point) => point.isOutlier).length,
      points,
    });
  }

  rows.sort(
    (left, right) =>
      right.currentMonthSpentCents - left.currentMonthSpentCents ||
      right.averageSpentCents - left.averageSpentCents ||
      left.categoryName.localeCompare(right.categoryName, "de"),
  );

  return {
    monthFrom: categoryReport.monthFrom,
    monthTo: categoryReport.monthTo,
    months,
    rows,
    availableMonths: listCategoryReportAvailableMonths(),
  };
}
