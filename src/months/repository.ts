import "server-only";

import { getDb } from "@/src/db/client";
import {
  freezeMonthlyCategoryBudgetValues,
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
import { hasBudgetSnapshot } from "@/src/months/budget-snapshots";
import {
  assertMonthIsOpen,
  closeMonth as closeMonthStatus,
  getMonthStatus,
  normalizeMonthKey,
  reopenMonth as reopenMonthStatus,
  type MonthStatus,
} from "@/src/months/status";

export {
  assertMonthIsOpen,
  getMonthStatus,
  normalizeMonthKey,
  type MonthStatus,
  type MonthStatusValue,
} from "@/src/months/status";

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
  displayNameOverride: string | null;
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
  specialBudgetIconName: string | null;
  importRunId: number | null;
  isFixedCostControlCandidate: boolean;
};

export type MonthFixedCostControlMatchRow = {
  transactionId: number;
  bookingDate: string;
  description: string;
  displayNameOverride: string | null;
  displayName: string;
  counterpartyName: string | null;
  amountCents: number;
  controlAmountCents: number;
  importRunId: number | null;
  controlLabel: string;
  ruleName: string;
  controlSource: "automatic" | "manual";
};

export type MonthTotals = {
  monthKey: string;
  incomeCents: number;
  grossIncomeCents: number;
  incomeDeductionCents: number;
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
  iconName: string | null;
  monthKey: string;
  plannedAmountCents: number;
  actualExpenseCents: number;
  remainingAmountCents: number;
  isActive: boolean;
};

export type MonthSnapshot = {
  totals: MonthTotals;
  planSummary: MonthPlanSummary;
  fixedCostControlMatches: MonthFixedCostControlMatchRow[];
  categoryRows: MonthlyBudgetCategoryRow[];
  specialBudgetRows: MonthSpecialBudgetRow[];
  transactions: MonthDetailTransactionRow[];
};

export type MonthDetailSnapshot = {
  monthKey: string;
  label: string;
  detailHref: string;
  status: MonthStatus;
  previousMonth: MonthDetailNavigationLink;
  nextMonth: MonthDetailNavigationLink | null;
  dashboard: Omit<MonthSnapshot, "transactions">;
  transactions: MonthDetailTransactionRow[];
};

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

function hasFixedCostSnapshot(monthKey: string): boolean {
  return getMonthStatus(monthKey).hasFixedCostSnapshot;
}

export function closeMonth(monthKey: string): MonthStatus {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const db = getDb();
  const close = db.transaction(() => {
    const status = getMonthStatus(normalizedMonthKey);

    if (status.status === "open") {
      freezeMonthlyCategoryBudgetValues(normalizedMonthKey);
    }

    return closeMonthStatus(normalizedMonthKey);
  });

  return close();
}

export function reopenMonth(monthKey: string): MonthStatus {
  return reopenMonthStatus(monthKey);
}

function getGrossIncomeCents(monthKey: string): number {
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

function getIncomeDeductionCents(monthKey: string): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(-amount_cents), 0) AS total
        FROM transactions
        WHERE transaction_type = 'income_deduction'
          AND effective_month_key = ?
      `,
    )
    .get(monthKey) as { total: number };

  return row.total;
}

function getIncomeCents(monthKey: string): number {
  return getGrossIncomeCents(monthKey) - getIncomeDeductionCents(monthKey);
}

function listImportedExpenseRowsForMonth(monthKey: string): Array<{
  id: number;
  bookingDate: string;
  amountCents: number;
  description: string;
  displayNameOverride: string | null;
  counterpartyName: string | null;
  importRunId: number | null;
}> {
  return getDb()
    .prepare(
      `
        SELECT
          id,
          booking_date AS bookingDate,
          amount_cents AS amountCents,
          description,
          display_name_override AS displayNameOverride,
          counterparty_name AS counterpartyName,
          import_run_id AS importRunId
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
    displayNameOverride: string | null;
    counterpartyName: string | null;
    importRunId: number | null;
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

function buildImportedFixedCostControlMatches(
  monthKey: string,
): MonthFixedCostControlMatchRow[] {
  const importedExpenses = listImportedExpenseRowsForMonth(monthKey);
  if (importedExpenses.length === 0) {
    return [];
  }

  const rules = listActiveImportRules();
  const fixedCosts = listFixedCosts().filter((fixedCost) => fixedCost.isActive);
  const aliases = listImportDisplayAliases();
  const mappedRows = importedExpenses.map(mapImportedExpenseToMatcherRow);
  const suggestions = buildImportRuleSuggestions({
    rows: mappedRows,
    rules,
    fixedCosts,
  });

  const controlsByIndex = new Map<
    number,
    { label: string; ruleName: string }
  >();

  for (const suggestion of suggestions) {
    if (!suggestion.label.startsWith("Fixkosten-Kontrolle:")) {
      continue;
    }

    if (controlsByIndex.has(suggestion.rowIndex)) {
      continue;
    }

    controlsByIndex.set(suggestion.rowIndex, {
      label: suggestion.label,
      ruleName: suggestion.ruleName,
    });
  }

  const result: MonthFixedCostControlMatchRow[] = [];
  for (const [index, control] of controlsByIndex) {
    const row = importedExpenses[index];
    if (!row) {
      continue;
    }

    result.push({
      transactionId: row.id,
      bookingDate: row.bookingDate,
      description: row.description,
      displayNameOverride: row.displayNameOverride,
      displayName: resolveImportDisplayName({
        sourceType: "import",
        description: row.description,
        displayNameOverride: row.displayNameOverride,
        counterpartyName: row.counterpartyName,
        aliases,
      }),
      counterpartyName: row.counterpartyName,
      amountCents: row.amountCents,
      controlAmountCents: Math.max(0, -row.amountCents),
      importRunId: row.importRunId,
      controlLabel: control.label,
      ruleName: control.ruleName,
      controlSource: "automatic",
    });
  }

  return result;
}

function listFixedCostControlOverrideRowsForMonth(monthKey: string): Array<{
  transactionId: number;
  mode: "include" | "exclude";
}> {
  return getDb()
    .prepare(
      `
        SELECT
          t.id AS transactionId,
          override.mode
        FROM transaction_fixed_cost_control_overrides override
        INNER JOIN transactions t ON t.id = override.transaction_id
        WHERE t.effective_month_key = ?
      `,
    )
    .all(monthKey) as Array<{
    transactionId: number;
    mode: "include" | "exclude";
  }>;
}

function listManualFixedCostControlRowsForMonth(monthKey: string): Array<{
  id: number;
  sourceType: "manual" | "import";
  bookingDate: string;
  amountCents: number;
  description: string;
  displayNameOverride: string | null;
  counterpartyName: string | null;
  importRunId: number | null;
}> {
  return getDb()
    .prepare(
      `
        SELECT
          t.id,
          t.source_type AS sourceType,
          t.booking_date AS bookingDate,
          t.amount_cents AS amountCents,
          t.description,
          t.display_name_override AS displayNameOverride,
          t.counterparty_name AS counterpartyName,
          t.import_run_id AS importRunId
        FROM transaction_fixed_cost_control_overrides override
        INNER JOIN transactions t ON t.id = override.transaction_id
        WHERE override.mode = 'include'
          AND t.transaction_type = 'expense'
          AND t.effective_month_key = ?
        ORDER BY t.booking_date ASC, t.id ASC
      `,
    )
    .all(monthKey) as Array<{
    id: number;
    sourceType: "manual" | "import";
    bookingDate: string;
    amountCents: number;
    description: string;
    displayNameOverride: string | null;
    counterpartyName: string | null;
    importRunId: number | null;
  }>;
}

function buildManualFixedCostControlMatches(
  monthKey: string,
): MonthFixedCostControlMatchRow[] {
  const rows = listManualFixedCostControlRowsForMonth(monthKey);
  const aliases = listImportDisplayAliases();

  return rows.map((row) => ({
    transactionId: row.id,
    bookingDate: row.bookingDate,
    description: row.description,
    displayNameOverride: row.displayNameOverride,
    displayName: resolveImportDisplayName({
      sourceType: row.sourceType,
      description: row.description,
      displayNameOverride: row.displayNameOverride,
      counterpartyName: row.counterpartyName,
      aliases,
    }),
    counterpartyName: row.counterpartyName,
    amountCents: row.amountCents,
    controlAmountCents: Math.max(0, -row.amountCents),
    importRunId: row.importRunId,
    controlLabel: "Fixkosten-Kontrolle: Manuell markiert",
    ruleName: "Manuelle Fixkosten-Markierung",
    controlSource: "manual",
  }));
}

function buildFixedCostControlMatches(
  monthKey: string,
): MonthFixedCostControlMatchRow[] {
  const overrides = listFixedCostControlOverrideRowsForMonth(monthKey);
  const excludedTransactionIds = new Set(
    overrides
      .filter((override) => override.mode === "exclude")
      .map((override) => override.transactionId),
  );
  const matchesByTransactionId = new Map<number, MonthFixedCostControlMatchRow>();

  for (const match of buildImportedFixedCostControlMatches(monthKey)) {
    if (!excludedTransactionIds.has(match.transactionId)) {
      matchesByTransactionId.set(match.transactionId, match);
    }
  }

  for (const match of buildManualFixedCostControlMatches(monthKey)) {
    matchesByTransactionId.set(match.transactionId, match);
  }

  return Array.from(matchesByTransactionId.values()).sort((first, second) =>
    first.bookingDate.localeCompare(second.bookingDate) ||
    first.transactionId - second.transactionId,
  );
}

function assertExpenseTransactionInMonth(
  transactionId: number,
  monthKey: string,
): void {
  const row = getDb()
    .prepare(
      `
        SELECT transaction_type AS transactionType
        FROM transactions
        WHERE id = ?
          AND effective_month_key = ?
      `,
    )
    .get(transactionId, monthKey) as
    | { transactionType: TransactionType }
    | undefined;

  if (!row) {
    throw new Error("Buchung wurde in diesem Monat nicht gefunden.");
  }

  if (row.transactionType !== "expense") {
    throw new Error("Nur Ausgaben können als Fixkosten-Kontrolle markiert werden.");
  }
}

export function setFixedCostControlOverrideForMonth(
  transactionId: number,
  monthKey: string,
  mode: "include" | "exclude",
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  assertMonthIsOpen(normalizedMonthKey);
  assertExpenseTransactionInMonth(transactionId, normalizedMonthKey);

  getDb()
    .prepare(
      `
        INSERT INTO transaction_fixed_cost_control_overrides (
          transaction_id,
          mode,
          updated_at
        )
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(transaction_id) DO UPDATE SET
          mode = excluded.mode,
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .run(transactionId, mode);
}

export function clearFixedCostControlOverrideForMonth(
  transactionId: number,
  monthKey: string,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  assertMonthIsOpen(normalizedMonthKey);
  assertExpenseTransactionInMonth(transactionId, normalizedMonthKey);

  getDb()
    .prepare(
      "DELETE FROM transaction_fixed_cost_control_overrides WHERE transaction_id = ?",
    )
    .run(transactionId);
}

function sumFixedCostControlMatches(
  matches: MonthFixedCostControlMatchRow[],
): number {
  return matches.reduce((sum, match) => sum + match.controlAmountCents, 0);
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

function getLivePlannedFixedCostsCents(): number {
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

function getSnapshotPlannedFixedCostsCents(monthKey: string): number {
  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(planned_amount_cents_snapshot), 0) AS total
        FROM monthly_fixed_cost_snapshots
        WHERE month_key = ?
          AND is_included = 1
      `,
    )
    .get(monthKey) as { total: number };

  return row.total;
}

function getPlannedFixedCostsCents(monthKey: string): number {
  if (hasFixedCostSnapshot(monthKey)) {
    return getSnapshotPlannedFixedCostsCents(monthKey);
  }

  return getLivePlannedFixedCostsCents();
}

function listSpecialBudgetRows(
  monthKey: string,
  excludedTransactionIds: readonly number[] = [],
): MonthSpecialBudgetRow[] {
  const excludedTransactionFilter =
    excludedTransactionIds.length > 0
      ? `AND t.id NOT IN (${excludedTransactionIds.map(() => "?").join(", ")})`
      : "";

  if (hasBudgetSnapshot(monthKey)) {
    const snapshotRows = getDb()
      .prepare(
        `
          SELECT
            snapshot.special_budget_id AS id,
            snapshot.name_snapshot AS name,
            snapshot.icon_name_snapshot AS iconName,
            snapshot.month_key AS monthKey,
            snapshot.planned_amount_cents_snapshot AS plannedAmountCents,
            snapshot.is_visible_snapshot AS isActive,
            COALESCE(
              (
                SELECT SUM(-t.amount_cents)
                FROM transactions t
                WHERE t.transaction_type = 'expense'
                  AND t.special_budget_id = snapshot.special_budget_id
                  AND t.effective_month_key = snapshot.month_key
                  ${excludedTransactionFilter}
              ),
              0
            ) AS actualExpenseCents
          FROM monthly_special_budget_snapshots snapshot
          WHERE snapshot.month_key = ?
          ORDER BY
            snapshot.is_visible_snapshot DESC,
            snapshot.name_snapshot COLLATE NOCASE ASC
        `,
      )
      .all(...excludedTransactionIds, monthKey) as Array<{
      id: number;
      name: string;
      iconName: string | null;
      monthKey: string;
      plannedAmountCents: number;
      isActive: number;
      actualExpenseCents: number;
    }>;

    return snapshotRows.map((row) => ({
      id: row.id,
      name: row.name,
      iconName: row.iconName,
      monthKey: row.monthKey,
      plannedAmountCents: row.plannedAmountCents,
      actualExpenseCents: row.actualExpenseCents,
      remainingAmountCents:
        row.plannedAmountCents - row.actualExpenseCents,
      isActive: mapSqliteBoolean(row.isActive),
    }));
  }

  const rows = getDb()
    .prepare(
      `
        SELECT
          sb.id,
          sb.name,
          sbp.icon_name AS iconName,
          sb.month_key AS monthKey,
          sb.planned_amount_cents AS plannedAmountCents,
          CASE
            WHEN COALESCE(ms.status, 'open') = 'closed' THEN sb.is_active
            WHEN sb.is_active = 1 AND COALESCE(sbp.status, 'active') = 'active' THEN 1
            ELSE 0
          END AS isActive,
          COALESCE(
            (
              SELECT SUM(-t.amount_cents)
              FROM transactions t
              WHERE t.transaction_type = 'expense'
                AND t.special_budget_id = sb.id
                ${excludedTransactionFilter}
            ),
            0
          ) AS actualExpenseCents
        FROM special_budgets sb
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        LEFT JOIN monthly_statuses ms ON ms.month_key = sb.month_key
        WHERE sb.month_key = ?
        ORDER BY isActive DESC, sb.name COLLATE NOCASE ASC
      `,
    )
    .all(...excludedTransactionIds, monthKey) as Array<{
    id: number;
    name: string;
    iconName: string | null;
    monthKey: string;
    plannedAmountCents: number;
    isActive: number;
    actualExpenseCents: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    iconName: row.iconName,
    monthKey: row.monthKey,
    plannedAmountCents: row.plannedAmountCents,
    actualExpenseCents: row.actualExpenseCents,
    remainingAmountCents: row.plannedAmountCents - row.actualExpenseCents,
    isActive: mapSqliteBoolean(row.isActive),
  }));
}

function listStoredMonthKeys(): string[] {
  const rows = getDb()
    .prepare(
      `
        SELECT DISTINCT monthKey
        FROM (
          SELECT effective_month_key AS monthKey FROM transactions
          UNION ALL
          SELECT month_key AS monthKey FROM monthly_category_budgets
          UNION ALL
          SELECT month_key AS monthKey FROM special_budgets
          UNION ALL
          SELECT month_key AS monthKey FROM monthly_todos
          UNION ALL
          SELECT month_key AS monthKey FROM monthly_statuses
        )
        WHERE monthKey IS NOT NULL
        ORDER BY monthKey DESC
      `,
    )
    .all() as Array<{ monthKey: string }>;

  return rows.map((entry) => entry.monthKey);
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
          t.display_name_override AS displayNameOverride,
          t.transaction_type AS transactionType,
          t.amount_cents AS amountCents,
          t.account_id AS accountId,
          source.name AS accountName,
          t.destination_account_id AS destinationAccountId,
          destination.name AS destinationAccountName,
          t.counterparty_name AS counterpartyName,
          t.category_id AS categoryId,
          CASE
            WHEN ms.budget_snapshot_created_at IS NOT NULL THEN category_snapshot.name_snapshot
            ELSE c.name
          END AS categoryName,
          CASE
            WHEN ms.budget_snapshot_created_at IS NOT NULL THEN category_snapshot.icon_name_snapshot
            ELSE c.icon_name
          END AS categoryIconName,
          t.special_budget_id AS specialBudgetId,
          CASE
            WHEN ms.budget_snapshot_created_at IS NOT NULL THEN special_snapshot.name_snapshot
            ELSE sb.name
          END AS specialBudgetName,
          CASE
            WHEN ms.budget_snapshot_created_at IS NOT NULL THEN special_snapshot.icon_name_snapshot
            ELSE sbp.icon_name
          END AS specialBudgetIconName,
          t.import_run_id AS importRunId
        FROM transactions t
        INNER JOIN accounts source ON source.id = t.account_id
        LEFT JOIN imported_transactions it ON it.transaction_id = t.id
        LEFT JOIN accounts destination ON destination.id = t.destination_account_id
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN special_budgets sb ON sb.id = t.special_budget_id
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        LEFT JOIN monthly_statuses ms ON ms.month_key = t.effective_month_key
        LEFT JOIN monthly_category_snapshots category_snapshot
          ON category_snapshot.month_key = t.effective_month_key
         AND category_snapshot.category_id = t.category_id
        LEFT JOIN monthly_special_budget_snapshots special_snapshot
          ON special_snapshot.month_key = t.effective_month_key
         AND special_snapshot.special_budget_id = t.special_budget_id
        WHERE t.effective_month_key = ?
        ORDER BY
          t.booking_date DESC,
          CASE
            WHEN it.source_row_index IS NULL THEN t.id
            ELSE COALESCE(
              (
                SELECT MAX(imported_t.id)
                FROM transactions imported_t
                WHERE imported_t.import_run_id = t.import_run_id
                  AND imported_t.booking_date = t.booking_date
              ),
              t.id
            )
          END DESC,
          CASE
            WHEN it.source_row_index IS NULL THEN 0
            ELSE it.source_row_index
          END ASC,
          t.id DESC
      `,
    )
    .all(normalizedMonthKey) as Array<Omit<MonthDetailTransactionRow, "displayName">>;

  return rows.map((row) => ({
    ...row,
    isFixedCostControlCandidate: row.transactionType === "expense",
    displayName: resolveImportDisplayName({
      sourceType: row.sourceType,
      description: row.description,
      displayNameOverride: row.displayNameOverride,
      counterpartyName: row.counterpartyName,
      aliases,
    }),
  }));
}

function excludeFixedCostControlTransactions(
  transactions: MonthDetailTransactionRow[],
  fixedCostControlMatches: MonthFixedCostControlMatchRow[],
): MonthDetailTransactionRow[] {
  if (fixedCostControlMatches.length === 0) {
    return transactions;
  }

  const controlledTransactionIds = new Set(
    fixedCostControlMatches.map((match) => match.transactionId),
  );

  return transactions.filter(
    (transaction) => !controlledTransactionIds.has(transaction.id),
  );
}

export function getMonthSnapshot(monthKey: string): MonthSnapshot {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const fixedCostControlMatches =
    buildFixedCostControlMatches(normalizedMonthKey);
  const actualFixedCostsCents =
    sumFixedCostControlMatches(fixedCostControlMatches);
  const grossIncomeCents = getGrossIncomeCents(normalizedMonthKey);
  const incomeDeductionCents = getIncomeDeductionCents(normalizedMonthKey);
  const incomeCents = grossIncomeCents - incomeDeductionCents;
  const expenseCents = getExpenseCents(
    normalizedMonthKey,
    actualFixedCostsCents,
  );
  const savingsCents = getSavingsActualCents(normalizedMonthKey);
  const plannedFixedCostsCents = getPlannedFixedCostsCents(normalizedMonthKey);
  const cashBalanceCents = getCashAccountSnapshot().currentBalanceCents;
  const fixedCostControlTransactionIds = fixedCostControlMatches.map(
    (match) => match.transactionId,
  );
  const categoryRows = listMonthlyBudgetCategories(
    normalizedMonthKey,
    fixedCostControlTransactionIds,
  );
  const specialBudgetRows = listSpecialBudgetRows(
    normalizedMonthKey,
    fixedCostControlTransactionIds,
  );
  const planSummary = buildMonthPlanSummary({
    incomeCents,
    categoryRows,
    specialBudgetRows,
  });

  return {
    totals: {
      monthKey: normalizedMonthKey,
      incomeCents,
      grossIncomeCents,
      incomeDeductionCents,
      expenseCents,
      savingsCents,
      plannedFixedCostsCents,
      actualFixedCostsCents,
      availableCents: incomeCents - expenseCents - plannedFixedCostsCents,
      cashBalanceCents,
    },
    planSummary,
    fixedCostControlMatches,
    categoryRows,
    specialBudgetRows,
    transactions: excludeFixedCostControlTransactions(
      listMonthTransactions(normalizedMonthKey),
      fixedCostControlMatches,
    ),
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
  const currentMonthValue = toComparableMonthValue(normalizedCurrentMonthKey);
  const storedMonthKeys = listStoredMonthKeys();
  const firstStoredMonthKey =
    storedMonthKeys.at(-1) ?? normalizedCurrentMonthKey;
  const firstMonthKey =
    toComparableMonthValue(firstStoredMonthKey) <=
    currentMonthValue
      ? firstStoredMonthKey
      : normalizedCurrentMonthKey;
  const futureStoredMonthKeys = storedMonthKeys.filter(
    (monthKey) => toComparableMonthValue(monthKey) > currentMonthValue,
  );
  const visibleMonthKeys = [
    ...futureStoredMonthKeys,
    ...buildMonthRange(firstMonthKey, normalizedCurrentMonthKey),
  ];

  return visibleMonthKeys.map((monthKey) => {
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
  });
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
    status: getMonthStatus(normalizedMonthKey),
    previousMonth: buildNavigationLink(previousMonthKey),
    nextMonth: nextMonthKey ? buildNavigationLink(nextMonthKey) : null,
    dashboard: {
      totals: snapshot.totals,
      planSummary: snapshot.planSummary,
      fixedCostControlMatches: snapshot.fixedCostControlMatches,
      categoryRows: snapshot.categoryRows,
      specialBudgetRows: snapshot.specialBudgetRows,
    },
    transactions: snapshot.transactions,
  };
}
