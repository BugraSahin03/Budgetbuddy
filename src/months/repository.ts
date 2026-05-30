import "server-only";

import { getDb } from "@/src/db/client";
import { getDashboardMonthSnapshot } from "@/src/dashboard/repository";

export type MonthTimelinePreview = {
  monthKey: string;
  label: string;
  detailHref: string;
  incomeCents: number;
  variableExpenseCents: number;
  plannedFixedCostsCents: number;
  availableCents: number;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Maerz",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format YYYY-MM vorliegen.");
  }

  return normalized;
}

function toComparableMonthValue(monthKey: string): number {
  const normalized = normalizeMonthKey(monthKey);
  const [year, month] = normalized.split("-").map((value) => Number.parseInt(value, 10));
  return year * 12 + month;
}

function fromComparableMonthValue(value: number): string {
  const year = Math.floor((value - 1) / 12);
  const month = value - year * 12;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(monthKey: string): string {
  const normalized = normalizeMonthKey(monthKey);
  const [year, month] = normalized.split("-");
  return `${MONTH_NAMES[Number.parseInt(month, 10) - 1]} ${year}`;
}

function getFirstStoredMonthKey(): string | null {
  const row = getDb()
    .prepare(
      `
        SELECT MIN(monthKey) AS firstMonthKey
        FROM (
          SELECT effective_month_key AS monthKey FROM transactions
          UNION ALL
          SELECT month_key AS monthKey FROM monthly_category_budgets
          UNION ALL
          SELECT month_key AS monthKey FROM special_budgets
        )
      `,
    )
    .get() as { firstMonthKey: string | null };

  return row.firstMonthKey;
}

export function buildMonthRange(firstMonthKey: string, lastMonthKey: string): string[] {
  const startValue = toComparableMonthValue(firstMonthKey);
  const endValue = toComparableMonthValue(lastMonthKey);

  if (startValue > endValue) {
    throw new Error("Startmonat darf nicht nach dem Endmonat liegen.");
  }

  const monthKeys: string[] = [];
  for (let currentValue = endValue; currentValue >= startValue; currentValue -= 1) {
    monthKeys.push(fromComparableMonthValue(currentValue));
  }

  return monthKeys;
}

export function listMonthTimeline(currentMonthKey = getCurrentMonthKey()): MonthTimelinePreview[] {
  const normalizedCurrentMonthKey = normalizeMonthKey(currentMonthKey);
  const firstStoredMonthKey = getFirstStoredMonthKey() ?? normalizedCurrentMonthKey;
  const firstMonthKey =
    toComparableMonthValue(firstStoredMonthKey) <= toComparableMonthValue(normalizedCurrentMonthKey)
      ? firstStoredMonthKey
      : normalizedCurrentMonthKey;

  return buildMonthRange(firstMonthKey, normalizedCurrentMonthKey).map((monthKey) => {
    const snapshot = getDashboardMonthSnapshot(monthKey);

    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      detailHref: `/?month=${monthKey}`,
      incomeCents: snapshot.totals.incomeCents,
      variableExpenseCents: snapshot.totals.expenseCents,
      plannedFixedCostsCents: snapshot.totals.plannedFixedCostsCents,
      availableCents: snapshot.totals.availableCents,
    };
  });
}
