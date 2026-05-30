import "server-only";

import { getDb } from "@/src/db/client";
import {
  getDashboardMonthSnapshot,
  type DashboardMonthSnapshot,
} from "@/src/dashboard/repository";
import type { TransactionType } from "@/src/transactions/repository";

export type MonthTimelinePreview = {
  monthKey: string;
  label: string;
  detailHref: string;
  incomeCents: number;
  variableExpenseCents: number;
  plannedFixedCostsCents: number;
  availableCents: number;
};

export type MonthDetailNavigationLink = {
  monthKey: string;
  label: string;
  href: string;
};

export type MonthDetailTransactionRow = {
  id: number;
  sourceType: "manual" | "import";
  bookingDate: string;
  effectiveMonthKey: string;
  description: string;
  transactionType: TransactionType;
  amountCents: number;
  accountName: string;
  destinationAccountName: string | null;
  counterpartyName: string | null;
  categoryName: string | null;
  specialBudgetName: string | null;
  importRunId: number | null;
};

export type MonthDetailSnapshot = {
  monthKey: string;
  label: string;
  detailHref: string;
  previousMonth: MonthDetailNavigationLink;
  nextMonth: MonthDetailNavigationLink | null;
  dashboard: DashboardMonthSnapshot;
  transactions: MonthDetailTransactionRow[];
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

export function normalizeMonthKey(monthKey: string): string {
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

export function fromComparableMonthValue(value: number): string {
  const year = Math.floor((value - 1) / 12);
  const month = value - year * 12;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
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

function buildMonthDetailHref(monthKey: string): string {
  return `/monate/${monthKey}`;
}

function buildNavigationLink(monthKey: string): MonthDetailNavigationLink {
  return {
    monthKey,
    label: formatMonthLabel(monthKey),
    href: buildMonthDetailHref(monthKey),
  };
}

function listMonthTransactions(monthKey: string): MonthDetailTransactionRow[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);

  return getDb()
    .prepare(
      `
        SELECT
          t.id,
          t.source_type AS sourceType,
          t.booking_date AS bookingDate,
          t.effective_month_key AS effectiveMonthKey,
          t.description,
          t.transaction_type AS transactionType,
          t.amount_cents AS amountCents,
          source.name AS accountName,
          destination.name AS destinationAccountName,
          t.counterparty_name AS counterpartyName,
          c.name AS categoryName,
          sb.name AS specialBudgetName,
          t.import_run_id AS importRunId
        FROM transactions t
        INNER JOIN accounts source ON source.id = t.account_id
        LEFT JOIN accounts destination ON destination.id = t.destination_account_id
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN special_budgets sb ON sb.id = t.special_budget_id
        WHERE t.effective_month_key = ?
        ORDER BY t.booking_date DESC, t.id DESC
      `,
    )
    .all(normalizedMonthKey) as MonthDetailTransactionRow[];
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
      detailHref: buildMonthDetailHref(monthKey),
      incomeCents: snapshot.totals.incomeCents,
      variableExpenseCents: snapshot.totals.expenseCents,
      plannedFixedCostsCents: snapshot.totals.plannedFixedCostsCents,
      availableCents: snapshot.totals.availableCents,
    };
  });
}

export function getMonthDetail(
  monthKey: string,
  currentMonthKey = getCurrentMonthKey(),
): MonthDetailSnapshot {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedCurrentMonthKey = normalizeMonthKey(currentMonthKey);
  const monthValue = toComparableMonthValue(normalizedMonthKey);
  const currentValue = toComparableMonthValue(normalizedCurrentMonthKey);

  const previousMonthKey = fromComparableMonthValue(monthValue - 1);
  const nextMonthKey = monthValue < currentValue ? fromComparableMonthValue(monthValue + 1) : null;

  return {
    monthKey: normalizedMonthKey,
    label: formatMonthLabel(normalizedMonthKey),
    detailHref: buildMonthDetailHref(normalizedMonthKey),
    previousMonth: buildNavigationLink(previousMonthKey),
    nextMonth: nextMonthKey ? buildNavigationLink(nextMonthKey) : null,
    dashboard: getDashboardMonthSnapshot(normalizedMonthKey),
    transactions: listMonthTransactions(normalizedMonthKey),
  };
}
