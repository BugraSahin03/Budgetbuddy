import "server-only";

import { getDb } from "@/src/db/client";
import { ensureAssignedBudgetSnapshot } from "@/src/months/budget-snapshots";
import { assertMonthIsOpen, normalizeMonthKey } from "@/src/months/status";

export type SettlementAssignment = {
  categoryId: number | null;
  specialBudgetId: number | null;
};

export type SettlementGroupRow = {
  id: number;
  monthKey: string;
  name: string;
  bookingDate: string;
  amountCents: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryIconName: string | null;
  specialBudgetId: number | null;
  specialBudgetName: string | null;
  specialBudgetIconName: string | null;
  memberCount: number;
  memberTransactionIds: number[];
};

function normalizeName(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) return "Verrechnung";
  if (normalized.length < 2 || normalized.length > 80) {
    throw new Error("Der Name muss zwischen 2 und 80 Zeichen lang sein.");
  }
  return normalized;
}

function normalizeTransactionIds(values: readonly number[]): number[] {
  const ids = [...new Set(values)];
  if (ids.length < 2 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("Wähle mindestens zwei gültige Buchungen aus.");
  }
  return ids;
}

export function createSettlement(
  monthKey: string,
  name: string,
  transactionIds: readonly number[],
): number {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedName = normalizeName(name);
  const ids = normalizeTransactionIds(transactionIds);
  assertMonthIsOpen(normalizedMonthKey);

  const placeholders = ids.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `
        SELECT
          t.id,
          t.amount_cents AS amountCents,
          t.transaction_type AS transactionType,
          t.effective_month_key AS monthKey,
          c.system_key AS categorySystemKey,
          member.transaction_id AS existingMemberId,
          control.transaction_id AS fixedControlId,
          override.transaction_id AS fixedOverrideId
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN transaction_settlement_members member
          ON member.transaction_id = t.id
        LEFT JOIN transaction_fixed_cost_control_matches control
          ON control.transaction_id = t.id
        LEFT JOIN transaction_fixed_cost_control_overrides override
          ON override.transaction_id = t.id AND override.mode = 'include'
        WHERE t.id IN (${placeholders})
      `,
    )
    .all(...ids) as Array<{
    id: number;
    amountCents: number;
    transactionType: string;
    monthKey: string;
    categorySystemKey: string | null;
    existingMemberId: number | null;
    fixedControlId: number | null;
    fixedOverrideId: number | null;
  }>;

  if (rows.length !== ids.length) {
    throw new Error("Mindestens eine ausgewählte Buchung wurde nicht gefunden.");
  }
  if (rows.some((row) => row.monthKey !== normalizedMonthKey)) {
    throw new Error("Alle Buchungen müssen aus demselben Monat stammen.");
  }
  if (
    rows.some(
      (row) =>
        !["expense", "income", "refund"].includes(row.transactionType) ||
        row.categorySystemKey === "savings" ||
        row.fixedControlId !== null ||
        row.fixedOverrideId !== null,
    )
  ) {
    throw new Error(
      "Transfers, Sparen, Einkommensabzüge und Fixkosten-Kontrollen können nicht verrechnet werden.",
    );
  }
  if (rows.some((row) => row.existingMemberId !== null)) {
    throw new Error("Mindestens eine Buchung ist bereits verrechnet.");
  }
  if (!rows.some((row) => row.amountCents < 0) || !rows.some((row) => row.amountCents > 0)) {
    throw new Error("Wähle mindestens eine Ausgabe und eine Einnahme aus.");
  }

  const db = getDb();
  const save = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO transaction_settlement_groups (month_key, name, is_finalized)
         VALUES (?, ?, 0)`,
      )
      .run(normalizedMonthKey, normalizedName);
    const groupId = Number(result.lastInsertRowid);
    const insertMember = db.prepare(
      `INSERT INTO transaction_settlement_members
       (settlement_group_id, transaction_id) VALUES (?, ?)`,
    );
    for (const id of ids) insertMember.run(groupId, id);
    const finalized = db
      .prepare(
        `UPDATE transaction_settlement_groups
         SET is_finalized = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND is_finalized = 0`,
      )
      .run(groupId);
    if (finalized.changes !== 1) {
      throw new Error("Verrechnung konnte nicht abgeschlossen werden.");
    }
    return groupId;
  });

  return save.immediate();
}

function getSettlementAmount(groupId: number, monthKey: string): number {
  const row = getDb()
    .prepare(
      `
        SELECT SUM(t.amount_cents) AS amountCents
        FROM transaction_settlement_groups g
        INNER JOIN transaction_settlement_members member
          ON member.settlement_group_id = g.id
        INNER JOIN transactions t ON t.id = member.transaction_id
        WHERE g.id = ? AND g.month_key = ? AND g.is_finalized = 1
      `,
    )
    .get(groupId, monthKey) as { amountCents: number | null } | undefined;
  if (!row || row.amountCents === null) throw new Error("Verrechnung wurde nicht gefunden.");
  return row.amountCents;
}

export function updateSettlementAssignment(
  groupId: number,
  monthKey: string,
  assignment: SettlementAssignment,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  assertMonthIsOpen(normalizedMonthKey);
  if (getSettlementAmount(groupId, normalizedMonthKey) >= 0) {
    throw new Error("Nur ein negatives Verrechnungsergebnis erhält eine Zuordnung.");
  }
  if (assignment.categoryId !== null && assignment.specialBudgetId !== null) {
    throw new Error("Wähle entweder eine Kategorie oder eine Sonderkategorie.");
  }

  if (assignment.categoryId !== null) {
    const category = getDb()
      .prepare(
        `SELECT is_active AS isActive, system_key AS systemKey
         FROM categories WHERE id = ?`,
      )
      .get(assignment.categoryId) as { isActive: number; systemKey: string | null } | undefined;
    if (!category || category.isActive !== 1 || category.systemKey === "savings") {
      throw new Error("Kategorie ist für eine Verrechnung nicht auswählbar.");
    }
  }

  if (assignment.specialBudgetId !== null) {
    const budget = getDb()
      .prepare(
        `SELECT is_active AS isActive, month_key AS monthKey
         FROM special_budgets WHERE id = ?`,
      )
      .get(assignment.specialBudgetId) as { isActive: number; monthKey: string } | undefined;
    if (!budget || budget.isActive !== 1 || budget.monthKey !== normalizedMonthKey) {
      throw new Error("Sonderkategorie ist für diesen Monat nicht auswählbar.");
    }
  }

  const changed = getDb()
    .prepare(
      `UPDATE transaction_settlement_groups
       SET category_id = ?, special_budget_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND month_key = ? AND is_finalized = 1`,
    )
    .run(assignment.categoryId, assignment.specialBudgetId, groupId, normalizedMonthKey);
  if (changed.changes !== 1) throw new Error("Verrechnung wurde nicht gefunden.");

  if (assignment.categoryId !== null || assignment.specialBudgetId !== null) {
    ensureAssignedBudgetSnapshot({
      monthKey: normalizedMonthKey,
      categoryId: assignment.categoryId,
      specialBudgetId: assignment.specialBudgetId,
    });
  }
}

export function dissolveSettlement(groupId: number, monthKey: string): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  assertMonthIsOpen(normalizedMonthKey);
  const db = getDb();
  const dissolve = db.transaction(() => {
    const unlocked = db
      .prepare(
        `UPDATE transaction_settlement_groups
         SET is_finalized = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND month_key = ? AND is_finalized = 1`,
      )
      .run(groupId, normalizedMonthKey);
    if (unlocked.changes !== 1) {
      throw new Error("Verrechnung wurde nicht gefunden.");
    }

    const deleted = db
      .prepare(
        "DELETE FROM transaction_settlement_groups WHERE id = ? AND month_key = ? AND is_finalized = 0",
      )
      .run(groupId, normalizedMonthKey);
    if (deleted.changes !== 1) {
      throw new Error("Verrechnung konnte nicht aufgelöst werden.");
    }
  });
  dissolve.immediate();
}

export function renameSettlement(
  groupId: number,
  monthKey: string,
  name: string,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedName = normalizeName(name);
  assertMonthIsOpen(normalizedMonthKey);

  const result = getDb()
    .prepare(
      `UPDATE transaction_settlement_groups
       SET name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND month_key = ? AND is_finalized = 1`,
    )
    .run(normalizedName, groupId, normalizedMonthKey);
  if (result.changes !== 1) throw new Error("Verrechnung wurde nicht gefunden.");
}

export function listSettlementGroups(monthKey: string): SettlementGroupRow[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const rows = getDb()
    .prepare(
      `
        SELECT
          g.id,
          g.month_key AS monthKey,
          g.name,
          MAX(t.booking_date) AS bookingDate,
          SUM(t.amount_cents) AS amountCents,
          g.category_id AS categoryId,
          CASE WHEN status.budget_snapshot_created_at IS NOT NULL
            THEN category_snapshot.name_snapshot ELSE c.name END AS categoryName,
          CASE WHEN status.budget_snapshot_created_at IS NOT NULL
            THEN category_snapshot.icon_name_snapshot ELSE c.icon_name END AS categoryIconName,
          g.special_budget_id AS specialBudgetId,
          CASE WHEN status.budget_snapshot_created_at IS NOT NULL
            THEN special_snapshot.name_snapshot ELSE sb.name END AS specialBudgetName,
          CASE WHEN status.budget_snapshot_created_at IS NOT NULL
            THEN special_snapshot.icon_name_snapshot ELSE sbp.icon_name END AS specialBudgetIconName,
          COUNT(*) AS memberCount,
          GROUP_CONCAT(t.id) AS memberTransactionIdsCsv
        FROM transaction_settlement_groups g
        INNER JOIN transaction_settlement_members member
          ON member.settlement_group_id = g.id
        INNER JOIN transactions t ON t.id = member.transaction_id
        LEFT JOIN categories c ON c.id = g.category_id
        LEFT JOIN special_budgets sb ON sb.id = g.special_budget_id
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        LEFT JOIN monthly_statuses status ON status.month_key = g.month_key
        LEFT JOIN monthly_category_snapshots category_snapshot
          ON category_snapshot.month_key = g.month_key
         AND category_snapshot.category_id = g.category_id
        LEFT JOIN monthly_special_budget_snapshots special_snapshot
          ON special_snapshot.month_key = g.month_key
         AND special_snapshot.special_budget_id = g.special_budget_id
        WHERE g.month_key = ? AND g.is_finalized = 1
        GROUP BY g.id
        ORDER BY bookingDate DESC, g.id DESC
      `,
    )
    .all(normalizedMonthKey) as Array<
      Omit<SettlementGroupRow, "memberTransactionIds"> & {
        memberTransactionIdsCsv: string;
      }
    >;

  return rows.map(({ memberTransactionIdsCsv, ...row }) => ({
    ...row,
    memberTransactionIds: memberTransactionIdsCsv
      .split(",")
      .map((value) => Number.parseInt(value, 10)),
  }));
}
