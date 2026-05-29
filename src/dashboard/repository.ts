import "server-only";

import { getDb } from "@/src/db/client";
import { listMonthlyBudgetCategories, type MonthlyBudgetCategoryRow } from "@/src/budgets/repository";
import { listFixedCosts } from "@/src/fixed-costs/repository";
import { buildImportRuleSuggestions } from "@/src/import-rules/matcher";
import { listActiveImportRules } from "@/src/import-rules/repository";
import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";
import { getCashAccountSnapshot } from "@/src/transactions/repository";

export type DashboardTotals = {
  monthKey: string;
  incomeCents: number;
  expenseCents: number;
  plannedFixedCostsCents: number;
  actualFixedCostsCents: number;
  availableCents: number;
  cashBalanceCents: number;
};

export type DashboardSpecialBudgetRow = {
  id: number;
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  actualExpenseCents: number;
  remainingAmountCents: number;
  isActive: boolean;
};

export type DashboardMonthSnapshot = {
  totals: DashboardTotals;
  categoryRows: MonthlyBudgetCategoryRow[];
  specialBudgetRows: DashboardSpecialBudgetRow[];
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format YYYY-MM vorliegen.");
  }

  return normalized;
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
      .filter((suggestion) => suggestion.label.startsWith("Fixkosten-Kontrolle:"))
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

function getExpenseCents(monthKey: string, fixedCostControlCents: number): number {
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

function listSpecialBudgetRows(monthKey: string): DashboardSpecialBudgetRow[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          sb.id,
          sb.name,
          sb.month_key AS monthKey,
          sb.planned_amount_cents AS plannedAmountCents,
          sb.is_active AS isActive,
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
        WHERE sb.month_key = ?
        ORDER BY sb.is_active DESC, sb.name COLLATE NOCASE ASC
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

export function getDashboardMonthSnapshot(monthKey: string): DashboardMonthSnapshot {
  const normalizedMonthKey = normalizeMonthKey(monthKey);

  const actualFixedCostsCents = buildImportedFixedCostControlCents(normalizedMonthKey);
  const incomeCents = getIncomeCents(normalizedMonthKey);
  const expenseCents = getExpenseCents(normalizedMonthKey, actualFixedCostsCents);
  const plannedFixedCostsCents = getPlannedFixedCostsCents();
  const cashBalanceCents = getCashAccountSnapshot().currentBalanceCents;

  return {
    totals: {
      monthKey: normalizedMonthKey,
      incomeCents,
      expenseCents,
      plannedFixedCostsCents,
      actualFixedCostsCents,
      availableCents: incomeCents - expenseCents - plannedFixedCostsCents,
      cashBalanceCents,
    },
    categoryRows: listMonthlyBudgetCategories(normalizedMonthKey),
    specialBudgetRows: listSpecialBudgetRows(normalizedMonthKey),
  };
}
