import "server-only";

import { getDb } from "@/src/db/client";
import { listMonthlyBudgetCategories, type MonthlyBudgetCategoryRow } from "@/src/budgets/repository";
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

function ensureFixedCostLinksTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS fixed_cost_transaction_links (
      transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
      fixed_cost_id INTEGER NOT NULL REFERENCES fixed_costs(id) ON DELETE RESTRICT,
      effective_month_key TEXT CHECK (effective_month_key IS NULL OR (length(effective_month_key) = 7 AND substr(effective_month_key, 5, 1) = '-')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
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
        WHERE source_type = 'manual'
          AND transaction_type IN ('income', 'refund')
          AND substr(booking_date, 1, 7) = ?
      `,
    )
    .get(monthKey) as { total: number };

  return row.total;
}

function getExpenseCents(monthKey: string): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(-amount_cents), 0) AS total
        FROM transactions
        WHERE source_type = 'manual'
          AND transaction_type = 'expense'
          AND substr(booking_date, 1, 7) = ?
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

function getActualFixedCostsCents(monthKey: string): number {
  ensureFixedCostLinksTable();

  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(-t.amount_cents), 0) AS total
        FROM fixed_cost_transaction_links fctl
        INNER JOIN transactions t ON t.id = fctl.transaction_id
        WHERE t.source_type = 'manual'
          AND t.transaction_type = 'expense'
          AND fctl.effective_month_key = ?
      `,
    )
    .get(monthKey) as { total: number };

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

  const incomeCents = getIncomeCents(normalizedMonthKey);
  const expenseCents = getExpenseCents(normalizedMonthKey);
  const plannedFixedCostsCents = getPlannedFixedCostsCents();
  const actualFixedCostsCents = getActualFixedCostsCents(normalizedMonthKey);
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
