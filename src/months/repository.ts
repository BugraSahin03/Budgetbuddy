import "server-only";

import { getDb } from "@/src/db/client";
import {
  listMonthlyBudgetCategories,
  type MonthlyBudgetCategoryRow,
} from "@/src/budgets/repository";
import { getSavingsActualCents } from "@/src/categories/repository";
import { listFixedCosts } from "@/src/fixed-costs/repository";
import { buildImportRuleSuggestions } from "@/src/import-rules/matcher";
import { listActiveImportRules } from "@/src/import-rules/repository";
import { resolveImportDisplayName } from "@/src/import/display-name";
import { listImportDisplayAliases } from "@/src/settings/import-display-aliases/repository";
import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";
import { getCashAccountSnapshot } from "@/src/transactions/repository";
import type { TransactionType } from "@/src/transactions/repository";
import {
  buildMonthPlanSummary,
  type MonthPlanSummary,
} from "@/src/months/plan-summary";

export type MonthTimelinePreview = {
  monthKey: string;
  label: string;
  detailHref: string;
  incomeCents: number;
  variableExpenseCents: number;
  plannedFixedCostsCents: number;
  availableCents: number;
};

export type MonthComparisonRow = {
  monthKey: string;
  label: string;
  detailHref: string;
  incomeCents: number;
  expenseCents: number;
  savingsCents: number;
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
  displayName: string;
  transactionType: TransactionType;
  amountCents: number;
  accountId: number;
  accountName: string;
  destinationAccountId: number | null;
  destinationAccountName: string | null;
  counterpartyName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIconName: string | null;
  specialBudgetId: number | null;
  specialBudgetName: string | null;
  importRunId: number | null;
};

export type MonthTotals = {
  monthKey: string;
  incomeCents: number;
  expenseCents: number;
  savingsCents: number;
  plannedFixedCostsCents: number;
  actualFixedCostsCents: number;
  availableCents: number;
  cashBalanceCents: number;
};

export type MonthSpecialBudgetRow = {
  id: number;
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  actualExpenseCents: number;
  remainingAmountCents: number;
  isActive: boolean;
};

export type MonthSnapshot = {
  totals: MonthTotals;
  planSummary: MonthPlanSummary;
  categoryRows: MonthlyBudgetCategoryRow[];
  specialBudgetRows: MonthSpecialBudgetRow[];
  transactions: MonthDetailTransactionRow[];
};

export type MonthDetailSnapshot = {
  monthKey: string;
  label: string;
  detailHref: string;
  previousMonth: MonthDetailNavigationLink;
  nextMonth: MonthDetailNavigationLink | null;
  dashboard: Omit<MonthSnapshot, "transactions">;
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
  const [year, month] = normalized
    .split("-")
    .map((value) => Number.parseInt(value, 10));
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

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function getIncomeCents(monthKey: string): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(amount_cents), 0) AS total
        FROM transactions
        WHERE transaction_type IN ('income', 'refund')
          AND effective_month_key = ?
      `,
    )
    .get(monthKey) as { total: number };

  return row.total;
}

function listImportedExpenseRowsForMonth(monthKey: string): Array<{
  id: number;
  bookingDate: string;
  amountCents: number;
  description: string;
  counterpartyName: string | null;
}> {
  return getDb()
    .prepare(
      `
        SELECT
          id,
          booking_date AS bookingDate,
          amount_cents AS amountCents,
          description,
          counterparty_name AS counterpartyName
        FROM transactions
        WHERE source_type = 'import'
          AND transaction_type = 'expense'
          AND effective_month_key = ?
        ORDER BY booking_date ASC, id ASC
      `,
    )
    .all(monthKey) as Array<{
    id: number;
    bookingDate: string;
    amountCents: number;
    description: string;
    counterpartyName: string | null;
  }>;
}

function mapImportedExpenseToMatcherRow(
  row: ReturnType<typeof listImportedExpenseRowsForMonth>[number],
): SparkasseCsvRow {
  return {
    accountIban: "",
    bookingDate: row.bookingDate,
    valueDate: row.bookingDate,
    bookingText: row.description,
    purpose: "",
    counterparty: row.counterpartyName ?? "",
    counterpartyIban: "",
    counterpartyBic: "",
    amountCents: row.amountCents,
    currencyCode: "EUR",
    info: "",
    endToEndReference: "",
    mandateReference: "",
    description: row.description,
  };
}

function buildImportedFixedCostControlCents(monthKey: string): number {
  const importedExpenses = listImportedExpenseRowsForMonth(monthKey);
  if (importedExpenses.length === 0) {
    return 0;
  }

  const rules = listActiveImportRules();
  const fixedCosts = listFixedCosts().filter((fixedCost) => fixedCost.isActive);
  const mappedRows = importedExpenses.map(mapImportedExpenseToMatcherRow);
  const suggestions = buildImportRuleSuggestions({
    rows: mappedRows,
    rules,
    fixedCosts,
  });

  const controlledIndices = new Set(
    suggestions
      .filter((suggestion) =>
        suggestion.label.startsWith("Fixkosten-Kontrolle:"),
      )
      .map((suggestion) => suggestion.rowIndex),
  );

  let total = 0;
  for (const index of controlledIndices) {
    const row = importedExpenses[index];
    if (!row) {
      continue;
    }
    total += Math.max(0, -row.amountCents);
  }

  return total;
}

function getExpenseCents(
  monthKey: string,
  fixedCostControlCents: number,
): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(-amount_cents), 0) AS total
        FROM transactions
        WHERE transaction_type = 'expense'
          AND effective_month_key = ?
      `,
    )
    .get(monthKey) as { total: number };

  return Math.max(0, row.total - fixedCostControlCents);
}

function getTotalExpenseCents(monthKey: string): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(-amount_cents), 0) AS total
        FROM transactions
        WHERE transaction_type = 'expense'
          AND effective_month_key = ?
      `,
    )
    .get(monthKey) as { total: number };

  return row.total;
}

function getPlannedFixedCostsCents(): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(planned_amount_cents), 0) AS total
        FROM fixed_costs
        WHERE is_active = 1
      `,
    )
    .get() as { total: number };

  return row.total;
}

function listSpecialBudgetRows(monthKey: string): MonthSpecialBudgetRow[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          sb.id,
          sb.name,
          sb.month_key AS monthKey,
          sb.planned_amount_cents AS plannedAmountCents,
          CASE
            WHEN sb.is_active = 1 AND COALESCE(sbp.status, 'active') = 'active' THEN 1
            ELSE 0
          END AS isActive,
          COALESCE(
            (
              SELECT SUM(-t.amount_cents)
              FROM transactions t
              WHERE t.transaction_type = 'expense'
                AND t.special_budget_id = sb.id
            ),
            0
          ) AS actualExpenseCents
        FROM special_budgets sb
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        WHERE sb.month_key = ?
        ORDER BY isActive DESC, sb.name COLLATE NOCASE ASC
      `,
    )
    .all(monthKey) as Array<{
    id: number;
    name: string;
    monthKey: string;
    plannedAmountCents: number;
    isActive: number;
    actualExpenseCents: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    monthKey: row.monthKey,
    plannedAmountCents: row.plannedAmountCents,
    actualExpenseCents: row.actualExpenseCents,
    remainingAmountCents: row.plannedAmountCents - row.actualExpenseCents,
    isActive: mapSqliteBoolean(row.isActive),
  }));
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

function getFirstTransactionMonthKey(): string | null {
  const row = getDb()
    .prepare(
      `
        SELECT MIN(effective_month_key) AS firstMonthKey
        FROM transactions
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
  const aliases = listImportDisplayAliases();

  const rows = getDb()
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
          t.account_id AS accountId,
          source.name AS accountName,
          t.destination_account_id AS destinationAccountId,
          destination.name AS destinationAccountName,
          t.counterparty_name AS counterpartyName,
          t.category_id AS categoryId,
          c.name AS categoryName,
          c.icon_name AS categoryIconName,
          t.special_budget_id AS specialBudgetId,
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
    .all(normalizedMonthKey) as Array<Omit<MonthDetailTransactionRow, "displayName">>;

  return rows.map((row) => ({
    ...row,
    displayName: resolveImportDisplayName({
      sourceType: row.sourceType,
      description: row.description,
      counterpartyName: row.counterpartyName,
      aliases,
    }),
  }));
}

export function getMonthSnapshot(monthKey: string): MonthSnapshot {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const actualFixedCostsCents =
    buildImportedFixedCostControlCents(normalizedMonthKey);
  const incomeCents = getIncomeCents(normalizedMonthKey);
  const expenseCents = getExpenseCents(
    normalizedMonthKey,
    actualFixedCostsCents,
  );
  const savingsCents = getSavingsActualCents(normalizedMonthKey);
  const plannedFixedCostsCents = getPlannedFixedCostsCents();
  const cashBalanceCents = getCashAccountSnapshot().currentBalanceCents;
  const categoryRows = listMonthlyBudgetCategories(normalizedMonthKey);
  const specialBudgetRows = listSpecialBudgetRows(normalizedMonthKey);
  const planSummary = buildMonthPlanSummary({
    incomeCents,
    categoryRows,
    specialBudgetRows,
  });

  return {
    totals: {
      monthKey: normalizedMonthKey,
      incomeCents,
      expenseCents,
      savingsCents,
      plannedFixedCostsCents,
      actualFixedCostsCents,
      availableCents: incomeCents - expenseCents - plannedFixedCostsCents,
      cashBalanceCents,
    },
    planSummary,
    categoryRows,
    specialBudgetRows,
    transactions: listMonthTransactions(normalizedMonthKey),
  };
}

export function buildMonthRange(
  firstMonthKey: string,
  lastMonthKey: string,
): string[] {
  const startValue = toComparableMonthValue(firstMonthKey);
  const endValue = toComparableMonthValue(lastMonthKey);

  if (startValue > endValue) {
    throw new Error("Startmonat darf nicht nach dem Endmonat liegen.");
  }

  const monthKeys: string[] = [];
  for (
    let currentValue = endValue;
    currentValue >= startValue;
    currentValue -= 1
  ) {
    monthKeys.push(fromComparableMonthValue(currentValue));
  }

  return monthKeys;
}

export function listMonthTimeline(
  currentMonthKey = getCurrentMonthKey(),
): MonthTimelinePreview[] {
  const normalizedCurrentMonthKey = normalizeMonthKey(currentMonthKey);
  const firstStoredMonthKey =
    getFirstStoredMonthKey() ?? normalizedCurrentMonthKey;
  const firstMonthKey =
    toComparableMonthValue(firstStoredMonthKey) <=
    toComparableMonthValue(normalizedCurrentMonthKey)
      ? firstStoredMonthKey
      : normalizedCurrentMonthKey;

  return buildMonthRange(firstMonthKey, normalizedCurrentMonthKey).map(
    (monthKey) => {
      const snapshot = getMonthSnapshot(monthKey);

      return {
        monthKey,
        label: formatMonthLabel(monthKey),
        detailHref: buildMonthDetailHref(monthKey),
        incomeCents: snapshot.totals.incomeCents,
        variableExpenseCents: snapshot.totals.expenseCents,
        plannedFixedCostsCents: snapshot.totals.plannedFixedCostsCents,
        availableCents: snapshot.totals.availableCents,
      };
    },
  );
}

export function listMonthComparison(
  currentMonthKey = getCurrentMonthKey(),
): MonthComparisonRow[] {
  const normalizedCurrentMonthKey = normalizeMonthKey(currentMonthKey);
  const firstStoredMonthKey =
    getFirstTransactionMonthKey() ?? normalizedCurrentMonthKey;
  const firstMonthKey =
    toComparableMonthValue(firstStoredMonthKey) <=
    toComparableMonthValue(normalizedCurrentMonthKey)
      ? firstStoredMonthKey
      : normalizedCurrentMonthKey;

  return buildMonthRange(firstMonthKey, normalizedCurrentMonthKey).map(
    (monthKey) => {
      return {
        monthKey,
        label: formatMonthLabel(monthKey),
        detailHref: buildMonthDetailHref(monthKey),
        incomeCents: getIncomeCents(monthKey),
        expenseCents: getTotalExpenseCents(monthKey),
        savingsCents: getSavingsActualCents(monthKey),
      };
    },
  );
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
  const nextMonthKey =
    monthValue < currentValue ? fromComparableMonthValue(monthValue + 1) : null;

  const snapshot = getMonthSnapshot(normalizedMonthKey);

  return {
    monthKey: normalizedMonthKey,
    label: formatMonthLabel(normalizedMonthKey),
    detailHref: buildMonthDetailHref(normalizedMonthKey),
    previousMonth: buildNavigationLink(previousMonthKey),
    nextMonth: nextMonthKey ? buildNavigationLink(nextMonthKey) : null,
    dashboard: {
      totals: snapshot.totals,
      planSummary: snapshot.planSummary,
      categoryRows: snapshot.categoryRows,
      specialBudgetRows: snapshot.specialBudgetRows,
    },
    transactions: snapshot.transactions,
  };
}
