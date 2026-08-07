#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";

export const SNAPSHOT_CONTRACT_VERSION = "budgetbuddy.coach.snapshot.v2";
export const QUERY_CATALOG_VERSION = "2026-08-04.1";
export const SUPPORTED_SCHEMA_VERSIONS = new Set(["0020_fin_126"]);

const DEFAULT_DATABASE_PATH = "/var/lib/budgetbuddy/budgetbuddy.db";
const DEFAULT_OUTPUT_DIRECTORY = "/var/lib/alfred-snapshots/budgetbuddy";
const DEFAULT_MONTH_COUNT = 13;
const DEFAULT_WEEK_COUNT = 12;
const MAX_HISTORY_FILES = 120;
const EUROPE_BERLIN = "Europe/Berlin";

function assertIntegerInRange(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
}

function formatDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addUtcDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = date.getUTCDay() || 7;
  return addUtcDays(dateKey, 1 - weekday);
}

function addMonths(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthKeys(currentMonthKey, count) {
  return Array.from({ length: count }, (_, index) =>
    addMonths(currentMonthKey, index - count + 1),
  );
}

function buildWeekStarts(currentDateKey, count) {
  const currentWeekStart = startOfIsoWeek(currentDateKey);
  return Array.from({ length: count }, (_, index) =>
    addUtcDays(currentWeekStart, (index - count + 1) * 7),
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sumBy(items, selector) {
  return items.reduce((sum, item) => sum + selector(item), 0);
}

function emptyTransactionTotals() {
  return {
    grossIncomeCents: 0,
    incomeDeductionCents: 0,
    netIncomeCents: 0,
    refundCents: 0,
    totalExpenseCents: 0,
    fixedCostControlCents: 0,
    expenseCents: 0,
    savingsCents: 0,
    consumerExpenseCents: 0,
    netCashflowCents: 0,
    transactionCount: 0,
    unassignedExpenseCount: 0,
    unassignedExpenseCents: 0,
  };
}

function finalizeTransactionTotals(totals, fixedCostControlCents = 0) {
  totals.netIncomeCents = totals.grossIncomeCents - totals.incomeDeductionCents;
  totals.fixedCostControlCents = fixedCostControlCents;
  totals.expenseCents = Math.max(0, totals.totalExpenseCents - fixedCostControlCents);
  totals.consumerExpenseCents = Math.max(0, totals.expenseCents - totals.savingsCents);
  totals.netCashflowCents =
    totals.netIncomeCents + totals.refundCents - totals.totalExpenseCents;
  return totals;
}

export function openReadOnlyDatabase(databasePath) {
  if (!existsSync(databasePath)) {
    throw new Error(`BudgetBuddy database does not exist: ${databasePath}`);
  }

  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  db.pragma("query_only = ON");
  const queryOnly = db.pragma("query_only", { simple: true });
  if (queryOnly !== 1) {
    db.close();
    throw new Error("SQLite query_only could not be enabled.");
  }
  return db;
}

function readSchemaVersion(db) {
  const row = db
    .prepare("SELECT value FROM app_meta WHERE key = 'schema_version' LIMIT 1")
    .get();
  const schemaVersion = row?.value;
  if (typeof schemaVersion !== "string" || schemaVersion.length === 0) {
    throw new Error("BudgetBuddy schema version is missing.");
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(schemaVersion)) {
    throw new Error(`Unsupported BudgetBuddy schema version: ${schemaVersion}`);
  }
  return schemaVersion;
}

function readTransactionRows(db, fromMonthKey, toMonthKey) {
  return db
    .prepare(
      `
        SELECT
          t.id,
          t.booking_date AS bookingDate,
          t.effective_month_key AS monthKey,
          t.transaction_type AS transactionType,
          t.amount_cents AS amountCents,
          t.currency_code AS currencyCode,
          t.category_id AS categoryId,
          t.special_budget_id AS specialBudgetId,
          c.name AS categoryName,
          c.system_key AS categorySystemKey
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.effective_month_key BETWEEN ? AND ?
        ORDER BY t.booking_date ASC, t.id ASC
      `,
    )
    .all(fromMonthKey, toMonthKey);
}

function addTransactionToTotals(totals, row) {
  const amountCents = Number(row.amountCents);
  totals.transactionCount += 1;

  switch (row.transactionType) {
    case "income":
      totals.grossIncomeCents += amountCents;
      break;
    case "income_deduction":
      totals.incomeDeductionCents += Math.max(0, -amountCents);
      break;
    case "refund":
      totals.refundCents += amountCents;
      break;
    case "expense":
      totals.totalExpenseCents += Math.max(0, -amountCents);
      if (row.categorySystemKey === "savings") {
        totals.savingsCents += Math.max(0, -amountCents);
      }
      if (row.categoryId === null && row.specialBudgetId === null) {
        totals.unassignedExpenseCount += 1;
        totals.unassignedExpenseCents += Math.max(0, -amountCents);
      }
      break;
    case "transfer":
      break;
    default:
      throw new Error(`Unsupported transaction type: ${row.transactionType}`);
  }
}

function readMonthStatuses(db) {
  return new Map(
    db
      .prepare(
        `
          SELECT
            month_key AS monthKey,
            status,
            fixed_cost_snapshot_created_at AS fixedCostSnapshotCreatedAt
          FROM monthly_statuses
        `,
      )
      .all()
      .map((row) => [row.monthKey, {
        status: row.status,
        hasFixedCostSnapshot: row.fixedCostSnapshotCreatedAt !== null,
      }]),
  );
}

function readActiveFixedCosts(db) {
  return db
    .prepare(
      `
        SELECT
          name,
          planned_amount_cents AS plannedAmountCents,
          booking_day_of_month AS bookingDayOfMonth,
          payment_note AS paymentNote
        FROM fixed_costs
        WHERE is_active = 1
        ORDER BY sort_order ASC, name COLLATE NOCASE ASC, id ASC
      `,
    )
    .all()
    .map((row) => ({
      name: row.name,
      plannedAmountCents: Number(row.plannedAmountCents),
      bookingDayOfMonth: row.bookingDayOfMonth === null
        ? null
        : Number(row.bookingDayOfMonth),
      paymentNote: row.paymentNote ?? null,
    }));
}

function readFixedCostSnapshotPlans(db, fromMonthKey, toMonthKey) {
  const result = new Map();
  const rows = db
    .prepare(
      `
        SELECT
          month_key AS monthKey,
          name_snapshot AS name,
          planned_amount_cents_snapshot AS plannedAmountCents,
          booking_day_of_month_snapshot AS bookingDayOfMonth
        FROM monthly_fixed_cost_snapshots
        WHERE is_included = 1
          AND month_key BETWEEN ? AND ?
        ORDER BY month_key ASC, id ASC
      `,
    )
    .all(fromMonthKey, toMonthKey);
  for (const row of rows) {
    const items = result.get(row.monthKey) ?? [];
    items.push({
      name: row.name,
      plannedAmountCents: Number(row.plannedAmountCents),
      bookingDayOfMonth: row.bookingDayOfMonth === null
        ? null
        : Number(row.bookingDayOfMonth),
    });
    result.set(row.monthKey, items);
  }
  return result;
}

function readPersistedFixedCostControlMatches(db, fromMonthKey, toMonthKey) {
  return new Map(
    db
      .prepare(
        `
          SELECT
            control.transaction_id AS transactionId,
            t.effective_month_key AS monthKey,
            t.booking_date AS bookingDate,
            t.amount_cents AS amountCents
          FROM transaction_fixed_cost_control_matches control
          INNER JOIN transactions t ON t.id = control.transaction_id
          WHERE t.transaction_type = 'expense'
            AND t.effective_month_key BETWEEN ? AND ?
        `,
      )
      .all(fromMonthKey, toMonthKey)
      .map((row) => [Number(row.transactionId), {
        transactionId: Number(row.transactionId),
        monthKey: row.monthKey,
        bookingDate: row.bookingDate,
        amountCents: Math.max(0, -Number(row.amountCents)),
        controlSource: "automatic_rule",
        fixedCostName: null,
      }]),
  );
}

function readFixedCostControlOverrides(db, fromMonthKey, toMonthKey) {
  return new Map(
    db
      .prepare(
        `
          SELECT override.transaction_id AS transactionId, override.mode
          FROM transaction_fixed_cost_control_overrides override
          INNER JOIN transactions t ON t.id = override.transaction_id
          WHERE t.effective_month_key BETWEEN ? AND ?
        `,
      )
      .all(fromMonthKey, toMonthKey)
      .map((row) => [Number(row.transactionId), row.mode]),
  );
}

function buildFixedCostControlMatches(
  transactionRows,
  persistedMatches,
  overrides,
) {
  const matches = new Map();
  for (const [transactionId, match] of persistedMatches) {
    if (overrides.get(transactionId) !== "exclude") {
      matches.set(transactionId, match);
    }
  }

  for (const row of transactionRows) {
    if (
      row.transactionType === "expense" &&
      overrides.get(Number(row.id)) === "include"
    ) {
      matches.set(Number(row.id), {
        transactionId: Number(row.id),
        monthKey: row.monthKey,
        bookingDate: row.bookingDate,
        amountCents: Math.max(0, -Number(row.amountCents)),
        controlSource: "manual",
        fixedCostName: null,
      });
    }
  }
  return matches;
}

function summarizeFixedCostControls(matches) {
  const entries = [...matches.values()];
  const sourceCounts = {
    automaticRule: entries.filter((entry) => entry.controlSource === "automatic_rule").length,
    automaticDirect: 0,
    manual: entries.filter((entry) => entry.controlSource === "manual").length,
  };
  return {
    actualCents: sumBy(entries, (entry) => entry.amountCents),
    matchCount: entries.length,
    sourceCounts,
  };
}

function publicFixedCostItems(items) {
  return items.map(({ name, plannedAmountCents, bookingDayOfMonth }) => ({
    name,
    plannedAmountCents,
    bookingDayOfMonth,
  }));
}

function summarizeFixedCostPlan(items, source) {
  const publicItems = publicFixedCostItems(items);
  const dueDays = new Map();
  for (const item of publicItems) {
    const key = item.bookingDayOfMonth === null ? "unknown" : String(item.bookingDayOfMonth);
    const current = dueDays.get(key) ?? { itemCount: 0, plannedCents: 0 };
    current.itemCount += 1;
    current.plannedCents += item.plannedAmountCents;
    dueDays.set(key, current);
  }
  return {
    source,
    plannedCents: sumBy(publicItems, (item) => item.plannedAmountCents),
    itemCount: publicItems.length,
    bookingDayKnownCount: publicItems.filter((item) => item.bookingDayOfMonth !== null).length,
    dueByDayOfMonth: [...dueDays.entries()].map(([day, values]) => ({
      day: day === "unknown" ? null : Number(day),
      ...values,
    })),
    items: publicItems,
  };
}

function readCategoryBudgets(db, monthKey) {
  const rows = db
    .prepare(
      `
        SELECT
          c.name,
          c.system_key AS systemKey,
          COALESCE(mcb.budget_amount_cents, c.default_budget_amount_cents) AS plannedCents
        FROM categories c
        LEFT JOIN monthly_category_budgets mcb
          ON mcb.category_id = c.id
         AND mcb.month_key = ?
        WHERE COALESCE(mcb.budget_amount_cents, c.default_budget_amount_cents) IS NOT NULL
        ORDER BY c.name COLLATE NOCASE ASC
      `,
    )
    .all(monthKey);
  return rows.map((row) => ({
    name: row.name,
    systemKey: row.systemKey ?? null,
    plannedCents: Number(row.plannedCents),
  }));
}

function readSpecialBudgets(db, monthKey) {
  const rows = db
    .prepare(
      `
        SELECT
          sb.name,
          sb.planned_amount_cents AS plannedCents,
          COALESCE(SUM(CASE
            WHEN t.transaction_type = 'expense' THEN -t.amount_cents
            ELSE 0
          END), 0) AS actualCents
        FROM special_budgets sb
        LEFT JOIN special_budget_projects project ON project.id = sb.project_id
        LEFT JOIN transactions t ON t.special_budget_id = sb.id
        WHERE sb.month_key = ?
          AND sb.is_active = 1
          AND COALESCE(project.status, 'active') = 'active'
        GROUP BY sb.id, sb.name, sb.planned_amount_cents
        ORDER BY sb.name COLLATE NOCASE ASC
      `,
    )
    .all(monthKey);
  return rows.map((row) => ({
    name: row.name,
    plannedCents: Number(row.plannedCents),
    actualCents: Number(row.actualCents),
    remainingCents: Number(row.plannedCents) - Number(row.actualCents),
  }));
}

function buildCategoryBreakdown(rows, fixedCostControlIds = new Set()) {
  const categories = new Map();
  for (const row of rows) {
    if (
      row.transactionType !== "expense" ||
      row.categoryId === null ||
      fixedCostControlIds.has(Number(row.id))
    ) {
      continue;
    }
    const key = row.categoryName;
    const current = categories.get(key) ?? {
      name: row.categoryName,
      systemKey: row.categorySystemKey ?? null,
      spentCents: 0,
      transactionCount: 0,
    };
    current.spentCents += Math.max(0, -Number(row.amountCents));
    current.transactionCount += 1;
    categories.set(key, current);
  }
  return [...categories.values()].sort(
    (left, right) =>
      right.spentCents - left.spentCents || left.name.localeCompare(right.name, "de"),
  );
}

function buildMonths(
  db,
  monthKeys,
  transactionRows,
  activeFixedCosts,
  fixedCostSnapshotPlans,
  fixedCostControlMatches,
) {
  const monthStatuses = readMonthStatuses(db);
  const activeFixedCostPlan = summarizeFixedCostPlan(activeFixedCosts, "active_fixed_costs");

  return monthKeys.map((monthKey) => {
    const rows = transactionRows.filter((row) => row.monthKey === monthKey);
    const monthControlMatches = new Map(
      [...fixedCostControlMatches].filter(([, match]) => match.monthKey === monthKey),
    );
    const fixedCostControlIds = new Set(monthControlMatches.keys());
    const fixedCostControl = summarizeFixedCostControls(monthControlMatches);
    const totals = emptyTransactionTotals();
    for (const row of rows) {
      addTransactionToTotals(totals, row);
    }
    const controlledUnassignedRows = rows.filter(
      (row) =>
        fixedCostControlIds.has(Number(row.id)) &&
        row.categoryId === null &&
        row.specialBudgetId === null,
    );
    totals.unassignedExpenseCount = Math.max(
      0,
      totals.unassignedExpenseCount - controlledUnassignedRows.length,
    );
    totals.unassignedExpenseCents = Math.max(
      0,
      totals.unassignedExpenseCents -
        sumBy(controlledUnassignedRows, (row) => Math.max(0, -Number(row.amountCents))),
    );
    finalizeTransactionTotals(totals, fixedCostControl.actualCents);

    const categoryBudgets = readCategoryBudgets(db, monthKey);
    const specialBudgets = readSpecialBudgets(db, monthKey);
    const monthStatus = monthStatuses.get(monthKey) ?? {
      status: "open",
      hasFixedCostSnapshot: false,
    };
    const fixedCostPlan = monthStatus.hasFixedCostSnapshot
      ? summarizeFixedCostPlan(
          fixedCostSnapshotPlans.get(monthKey) ?? [],
          "month_close_snapshot",
        )
      : activeFixedCostPlan;
    const fixedCosts = {
      planSource: fixedCostPlan.source,
      plannedCents: fixedCostPlan.plannedCents,
      plannedItemCount: fixedCostPlan.itemCount,
      actualControlCents: fixedCostControl.actualCents,
      actualControlCount: fixedCostControl.matchCount,
      outstandingPlanCents: Math.max(
        0,
        fixedCostPlan.plannedCents - fixedCostControl.actualCents,
      ),
      actualControlSourceCounts: fixedCostControl.sourceCounts,
    };

    return {
      monthKey,
      status: monthStatus.status,
      ...totals,
      plannedFixedCostsCents: fixedCostPlan.plannedCents,
      fixedCosts,
      plannedCategoryBudgetsCents: sumBy(categoryBudgets, (entry) => entry.plannedCents),
      plannedSpecialBudgetsCents: sumBy(specialBudgets, (entry) => entry.plannedCents),
      categories: buildCategoryBreakdown(rows, fixedCostControlIds),
      categoryBudgets,
      specialBudgets,
    };
  });
}

function buildWeeks(weekStarts, transactionRows, fixedCostControlMatches) {
  return weekStarts.map((weekStart) => {
    const weekEnd = addUtcDays(weekStart, 6);
    const rows = transactionRows.filter(
      (row) => row.bookingDate >= weekStart && row.bookingDate <= weekEnd,
    );
    const weekControlMatches = new Map(
      [...fixedCostControlMatches].filter(([, match]) =>
        match.bookingDate >= weekStart && match.bookingDate <= weekEnd,
      ),
    );
    const fixedCostControlIds = new Set(weekControlMatches.keys());
    const fixedCostControl = summarizeFixedCostControls(weekControlMatches);
    const totals = emptyTransactionTotals();
    for (const row of rows) {
      addTransactionToTotals(totals, row);
    }
    const controlledUnassignedRows = rows.filter(
      (row) =>
        fixedCostControlIds.has(Number(row.id)) &&
        row.categoryId === null &&
        row.specialBudgetId === null,
    );
    totals.unassignedExpenseCount = Math.max(
      0,
      totals.unassignedExpenseCount - controlledUnassignedRows.length,
    );
    totals.unassignedExpenseCents = Math.max(
      0,
      totals.unassignedExpenseCents -
        sumBy(controlledUnassignedRows, (row) => Math.max(0, -Number(row.amountCents))),
    );
    finalizeTransactionTotals(totals, fixedCostControl.actualCents);
    return {
      weekStart,
      weekEnd,
      ...totals,
      categories: buildCategoryBreakdown(rows, fixedCostControlIds),
    };
  });
}

function readAccounts(db) {
  return db
    .prepare(
      `
        SELECT
          a.name,
          a.account_type AS accountType,
          a.currency_code AS currencyCode,
          a.is_active AS isActive,
          a.opening_balance_cents
            + COALESCE(SUM(CASE WHEN t.account_id = a.id THEN t.amount_cents ELSE 0 END), 0)
            + COALESCE(SUM(CASE
                WHEN t.destination_account_id = a.id AND t.transaction_type = 'transfer'
                THEN -t.amount_cents
                ELSE 0
              END), 0) AS currentBalanceCents
        FROM accounts a
        LEFT JOIN transactions t
          ON t.account_id = a.id OR t.destination_account_id = a.id
        GROUP BY a.id, a.name, a.account_type, a.currency_code, a.is_active,
          a.opening_balance_cents
        ORDER BY a.name COLLATE NOCASE ASC
      `,
    )
    .all()
    .map((row) => ({
      name: row.name,
      accountType: row.accountType,
      currencyCode: row.currencyCode,
      isActive: row.isActive === 1,
      currentBalanceCents: Number(row.currentBalanceCents),
    }));
}

function buildQualityFacts(transactionRows, currentDateKey, fixedCostControlMatches) {
  const fixedCostControlIds = new Set(fixedCostControlMatches.keys());
  const unassignedExpenseRows = transactionRows.filter(
    (row) =>
      row.transactionType === "expense" &&
      row.categoryId === null &&
      row.specialBudgetId === null &&
      !fixedCostControlIds.has(Number(row.id)),
  );
  const bookingDates = transactionRows.map((row) => row.bookingDate).sort();
  const unsupportedCurrencyCount = transactionRows.filter(
    (row) => row.currencyCode !== "EUR",
  ).length;
  const futureTransactionCount = transactionRows.filter(
    (row) => row.bookingDate > currentDateKey,
  ).length;

  const warnings = [];
  if (transactionRows.length === 0) {
    warnings.push("NO_TRANSACTIONS");
  }
  if (unassignedExpenseRows.length > 0) {
    warnings.push("UNASSIGNED_EXPENSES");
  }
  if (unsupportedCurrencyCount > 0) {
    warnings.push("UNSUPPORTED_CURRENCY");
  }
  if (futureTransactionCount > 0) {
    warnings.push("FUTURE_DATED_TRANSACTIONS");
  }

  return {
    complete: unsupportedCurrencyCount === 0,
    warnings,
    scope: "snapshot_period",
    transactionCount: transactionRows.length,
    unassignedExpenseCount: unassignedExpenseRows.length,
    unsupportedCurrencyCount,
    futureTransactionCount,
    firstBookingDate: bookingDates[0] ?? null,
    latestBookingDate: bookingDates.at(-1) ?? null,
  };
}

function readFirstRelevantMonthKey(db) {
  const row = db
    .prepare(
      `
        SELECT MIN(monthKey) AS firstMonthKey
        FROM (
          SELECT effective_month_key AS monthKey FROM transactions
          UNION ALL
          SELECT month_key AS monthKey FROM monthly_category_budgets
          UNION ALL
          SELECT month_key AS monthKey FROM special_budgets
          UNION ALL
          SELECT month_key AS monthKey FROM monthly_statuses
        )
        WHERE monthKey IS NOT NULL
      `,
    )
    .get();
  return row.firstMonthKey ?? null;
}

export function buildSnapshot(db, options = {}) {
  const now = options.now ?? new Date();
  const monthCount = options.monthCount ?? DEFAULT_MONTH_COUNT;
  const weekCount = options.weekCount ?? DEFAULT_WEEK_COUNT;
  assertIntegerInRange(monthCount, "monthCount", 1, 36);
  assertIntegerInRange(weekCount, "weekCount", 1, 26);

  const capturedAt = now.toISOString();
  const currentDateKey = formatDateInTimeZone(now, EUROPE_BERLIN);
  const currentMonthKey = currentDateKey.slice(0, 7);
  const candidateMonthKeys = buildMonthKeys(currentMonthKey, monthCount);
  const weekStarts = buildWeekStarts(currentDateKey, weekCount);

  db.exec("BEGIN");
  try {
    const schemaVersion = readSchemaVersion(db);
    const firstRelevantMonthKey = readFirstRelevantMonthKey(db);
    const relevantMonthKeys = firstRelevantMonthKey
      ? candidateMonthKeys.filter((monthKey) => monthKey >= firstRelevantMonthKey)
      : [];
    const monthKeys = relevantMonthKeys.length > 0 ? relevantMonthKeys : [currentMonthKey];
    const transactionRows = readTransactionRows(db, monthKeys[0], monthKeys.at(-1));
    const activeFixedCosts = readActiveFixedCosts(db);
    const fixedCostSnapshotPlans = readFixedCostSnapshotPlans(
      db,
      monthKeys[0],
      monthKeys.at(-1),
    );
    const persistedFixedCostControlMatches = readPersistedFixedCostControlMatches(
      db,
      monthKeys[0],
      monthKeys.at(-1),
    );
    const fixedCostControlOverrides = readFixedCostControlOverrides(
      db,
      monthKeys[0],
      monthKeys.at(-1),
    );
    const fixedCostControlMatches = buildFixedCostControlMatches(
      transactionRows,
      persistedFixedCostControlMatches,
      fixedCostControlOverrides,
    );
    const months = buildMonths(
      db,
      monthKeys,
      transactionRows,
      activeFixedCosts,
      fixedCostSnapshotPlans,
      fixedCostControlMatches,
    );
    const weeks = buildWeeks(weekStarts, transactionRows, fixedCostControlMatches);
    const accounts = readAccounts(db);
    const dataQuality = buildQualityFacts(
      transactionRows,
      currentDateKey,
      fixedCostControlMatches,
    );
    db.exec("COMMIT");

    const totalFixedCostControlCents = sumBy(
      months,
      (month) => month.fixedCostControlCents,
    );
    const totals = finalizeTransactionTotals({
      grossIncomeCents: sumBy(months, (month) => month.grossIncomeCents),
      incomeDeductionCents: sumBy(months, (month) => month.incomeDeductionCents),
      netIncomeCents: 0,
      refundCents: sumBy(months, (month) => month.refundCents),
      totalExpenseCents: sumBy(months, (month) => month.totalExpenseCents),
      fixedCostControlCents: 0,
      expenseCents: sumBy(months, (month) => month.expenseCents),
      savingsCents: sumBy(months, (month) => month.savingsCents),
      consumerExpenseCents: 0,
      netCashflowCents: 0,
      transactionCount: sumBy(months, (month) => month.transactionCount),
      unassignedExpenseCount: sumBy(months, (month) => month.unassignedExpenseCount),
      unassignedExpenseCents: sumBy(months, (month) => month.unassignedExpenseCents),
    }, totalFixedCostControlCents);

    const currentFixedCostPlan = summarizeFixedCostPlan(
      activeFixedCosts,
      "active_fixed_costs",
    );
    const fixedCosts = {
      semantics: {
        plan:
          "Planned monthly fixed-cost block. Open months use the current active list; " +
          "months closed with a snapshot use their frozen month-close plan.",
        actualControl:
          "Posted expense transactions persistently marked by an explicit control " +
          "rule at import time or by a manual override. It is an observed control " +
          "total, not a forecast.",
        expense:
          "expenseCents excludes recognized fixed-cost controls; totalExpenseCents " +
          "includes every posted expense transaction. Never subtract the fixed-cost " +
          "plan from totalExpenseCents without accounting for already posted controls.",
      },
      currentPlan: currentFixedCostPlan,
      historicalMonthClosePlans: [...fixedCostSnapshotPlans.entries()].map(
        ([monthKey, items]) => ({
          monthKey,
          ...summarizeFixedCostPlan(items, "month_close_snapshot"),
        }),
      ),
    };

    const snapshotWithoutIntegrity = {
      contractVersion: SNAPSHOT_CONTRACT_VERSION,
      source: {
        system: "budgetbuddy",
        schemaVersion,
        queryCatalogVersion: QUERY_CATALOG_VERSION,
        accessMode: "sqlite-readonly-query-only",
      },
      capturedAt,
      timeZone: EUROPE_BERLIN,
      period: {
        fromMonth: monthKeys[0],
        toMonth: monthKeys.at(-1),
        weekFrom: weekStarts[0],
        weekTo: addUtcDays(weekStarts.at(-1), 6),
      },
      currentMonthKey,
      totals,
      accounts,
      fixedCosts,
      months,
      weeks,
      dataQuality,
      privacy: {
        transactionAggregationOnly: true,
        fixedCostPlanItemsIncluded: true,
        excludedFields: [
          "transaction.id",
          "transaction.description",
          "transaction.counterparty",
          "transaction.iban",
          "transaction.importFingerprint",
          "import.rawFields",
          "notes",
        ],
      },
    };

    const hashInput = {
      ...snapshotWithoutIntegrity,
      capturedAt: undefined,
    };
    return {
      ...snapshotWithoutIntegrity,
      integrity: {
        algorithm: "sha256",
        dataSha256: sha256(JSON.stringify(hashInput)),
      },
    };
  } catch (error) {
    if (db.inTransaction) {
      db.exec("ROLLBACK");
    }
    throw error;
  }
}

function writeAtomically(filePath, content) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o640);
    writeFileSync(descriptor, content, "utf8");
    closeSync(descriptor);
    descriptor = undefined;
    chmodSync(temporaryPath, 0o640);
    renameSync(temporaryPath, filePath);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    rmSync(temporaryPath, { force: true });
  }
}

function readExistingHash(latestPath) {
  if (!existsSync(latestPath)) {
    return null;
  }
  const stats = statSync(latestPath);
  if (!stats.isFile() || stats.size > 2_000_000) {
    throw new Error("Existing BudgetBuddy snapshot is not a valid regular file.");
  }
  const parsed = JSON.parse(readFileSync(latestPath, "utf8"));
  return parsed?.integrity?.dataSha256 ?? null;
}

function pruneHistory(historyDirectory) {
  const files = readdirSync(historyDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  for (const name of files.slice(0, Math.max(0, files.length - MAX_HISTORY_FILES))) {
    rmSync(path.join(historyDirectory, name), { force: true });
  }
}

export function persistSnapshot(snapshot, outputDirectory) {
  mkdirSync(outputDirectory, { recursive: true, mode: 0o750 });
  const historyDirectory = path.join(outputDirectory, "history");
  mkdirSync(historyDirectory, { recursive: true, mode: 0o750 });

  const latestPath = path.join(outputDirectory, "latest.json");
  const existingHash = readExistingHash(latestPath);
  const content = `${JSON.stringify(snapshot, null, 2)}\n`;
  const changed = existingHash !== snapshot.integrity.dataSha256;

  if (changed) {
    const timestamp = snapshot.capturedAt.replaceAll("-", "").replaceAll(":", "");
    const historyName = `${timestamp}-${snapshot.integrity.dataSha256.slice(0, 12)}.json`;
    writeAtomically(path.join(historyDirectory, historyName), content);
    pruneHistory(historyDirectory);
  }
  writeAtomically(latestPath, content);

  return {
    latestPath,
    changed,
    dataSha256: snapshot.integrity.dataSha256,
  };
}

export function collectSnapshot(options = {}) {
  const databasePath = options.databasePath ?? DEFAULT_DATABASE_PATH;
  const outputDirectory = options.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  const db = openReadOnlyDatabase(databasePath);
  try {
    const snapshot = buildSnapshot(db, options);
    const persisted = persistSnapshot(snapshot, outputDirectory);
    return { snapshot, ...persisted };
  } finally {
    db.close();
  }
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--db" && value) {
      result.databasePath = value;
      index += 1;
    } else if (argument === "--output" && value) {
      result.outputDirectory = value;
      index += 1;
    } else if (argument === "--months" && value) {
      result.monthCount = Number(value);
      index += 1;
    } else if (argument === "--weeks" && value) {
      result.weekCount = Number(value);
      index += 1;
    } else if (argument === "--now" && value) {
      const now = new Date(value);
      if (Number.isNaN(now.getTime())) {
        throw new Error("--now must be an ISO timestamp.");
      }
      result.now = now;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  return result;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  process.umask(0o027);
  try {
    const result = collectSnapshot(parseArguments(process.argv.slice(2)));
    console.log(
      JSON.stringify({
        status: "ok",
        contractVersion: result.snapshot.contractVersion,
        schemaVersion: result.snapshot.source.schemaVersion,
        capturedAt: result.snapshot.capturedAt,
        changed: result.changed,
        dataSha256: result.dataSha256,
        latestPath: result.latestPath,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  }
}
