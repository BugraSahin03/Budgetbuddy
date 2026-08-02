import "server-only";

import { getDb } from "@/src/db/client";
import { listFixedCosts } from "@/src/fixed-costs/repository";
import { insertBudgetSnapshotRows } from "@/src/months/budget-snapshots";

export type MonthStatusValue = "open" | "closed";

export type MonthStatus = {
  monthKey: string;
  status: MonthStatusValue;
  hasFixedCostSnapshot: boolean;
  hasBudgetSnapshot: boolean;
  closedAt: string | null;
  reopenedAt: string | null;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const CLOSED_MONTH_ERROR_MESSAGE =
  "Monat ist abgeschlossen und kann nicht bearbeitet werden.";

export function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format YYYY-MM vorliegen.");
  }

  return normalized;
}

function mapMonthStatusRow(row: {
  monthKey: string;
  status: MonthStatusValue;
  fixedCostSnapshotCreatedAt: string | null;
  budgetSnapshotCreatedAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
}): MonthStatus {
  return {
    monthKey: row.monthKey,
    status: row.status,
    hasFixedCostSnapshot: row.fixedCostSnapshotCreatedAt !== null,
    hasBudgetSnapshot: row.budgetSnapshotCreatedAt !== null,
    closedAt: row.closedAt,
    reopenedAt: row.reopenedAt,
  };
}

export function getMonthStatus(monthKey: string): MonthStatus {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const row = getDb()
    .prepare(
      `
        SELECT
          month_key AS monthKey,
          status,
          fixed_cost_snapshot_created_at AS fixedCostSnapshotCreatedAt,
          budget_snapshot_created_at AS budgetSnapshotCreatedAt,
          closed_at AS closedAt,
          reopened_at AS reopenedAt
        FROM monthly_statuses
        WHERE month_key = ?
      `,
    )
    .get(normalizedMonthKey) as
    | {
        monthKey: string;
        status: MonthStatusValue;
        fixedCostSnapshotCreatedAt: string | null;
        budgetSnapshotCreatedAt: string | null;
        closedAt: string | null;
        reopenedAt: string | null;
      }
    | undefined;

  if (!row) {
    return {
      monthKey: normalizedMonthKey,
      status: "open",
      hasFixedCostSnapshot: false,
      hasBudgetSnapshot: false,
      closedAt: null,
      reopenedAt: null,
    };
  }

  return mapMonthStatusRow(row);
}

export function isMonthClosed(monthKey: string): boolean {
  return getMonthStatus(monthKey).status === "closed";
}

export function assertMonthIsOpen(monthKey: string): void {
  if (isMonthClosed(monthKey)) {
    throw new Error(CLOSED_MONTH_ERROR_MESSAGE);
  }
}

function insertFixedCostSnapshotRows(monthKey: string): void {
  const fixedCosts = listFixedCosts().filter((fixedCost) => fixedCost.isActive);
  const insertSnapshot = getDb().prepare(
    `
      INSERT OR IGNORE INTO monthly_fixed_cost_snapshots (
        month_key,
        fixed_cost_id,
        name_snapshot,
        planned_amount_cents_snapshot,
        booking_day_of_month_snapshot,
        payment_note_snapshot,
        note_snapshot,
        is_included
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `,
  );

  for (const fixedCost of fixedCosts) {
    insertSnapshot.run(
      monthKey,
      fixedCost.id,
      fixedCost.name,
      fixedCost.plannedAmountCents,
      fixedCost.bookingDayOfMonth,
      fixedCost.paymentNote,
      fixedCost.note,
    );
  }
}

export function closeMonth(monthKey: string): MonthStatus {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const db = getDb();

  const close = db.transaction(() => {
    const beforeClose = getMonthStatus(normalizedMonthKey);
    const shouldCreateFixedCostSnapshot = !beforeClose.hasFixedCostSnapshot;
    const shouldCreateBudgetSnapshot = !beforeClose.hasBudgetSnapshot;

    db.prepare(
      `
        INSERT INTO monthly_statuses (
          month_key,
          status,
          fixed_cost_snapshot_created_at,
          budget_snapshot_created_at,
          closed_at,
          updated_at
        )
        VALUES (
          ?,
          'closed',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(month_key) DO UPDATE SET
          status = 'closed',
          fixed_cost_snapshot_created_at = COALESCE(monthly_statuses.fixed_cost_snapshot_created_at, CURRENT_TIMESTAMP),
          budget_snapshot_created_at = COALESCE(monthly_statuses.budget_snapshot_created_at, CURRENT_TIMESTAMP),
          closed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `,
    ).run(normalizedMonthKey);

    if (shouldCreateFixedCostSnapshot) {
      insertFixedCostSnapshotRows(normalizedMonthKey);
    }

    if (shouldCreateBudgetSnapshot) {
      insertBudgetSnapshotRows(normalizedMonthKey);
    }
  });

  close();

  return getMonthStatus(normalizedMonthKey);
}

export function reopenMonth(monthKey: string): MonthStatus {
  const normalizedMonthKey = normalizeMonthKey(monthKey);

  getDb()
    .prepare(
      `
        INSERT INTO monthly_statuses (
          month_key,
          status,
          reopened_at,
          updated_at
        )
        VALUES (?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(month_key) DO UPDATE SET
          status = 'open',
          reopened_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .run(normalizedMonthKey);

  return getMonthStatus(normalizedMonthKey);
}
