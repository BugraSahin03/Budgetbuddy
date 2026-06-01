import "server-only";

import { getDb } from "@/src/db/client";

export type SpecialBudgetListItem = {
  id: number;
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  note: string | null;
  isActive: boolean;
  actualExpenseCents: number;
};

export type SpecialBudgetInput = {
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  note: string;
};

export type ActiveSpecialBudgetOption = {
  id: number;
  name: string;
  monthKey: string;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function normalizeName(name: string): string {
  const normalized = name.trim();

  if (normalized.length < 2) {
    throw new Error("Name muss mindestens 2 Zeichen enthalten.");
  }

  if (normalized.length > 80) {
    throw new Error("Name darf maximal 80 Zeichen enthalten.");
  }

  return normalized;
}

function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format JJJJ-MM vorliegen.");
  }

  return normalized;
}

function assertSpecialBudgetBelongsToMonth(
  specialBudgetId: number,
  monthKey: string,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const row = getDb()
    .prepare(
      `
        SELECT id
        FROM special_budgets
        WHERE id = ?
          AND month_key = ?
        LIMIT 1
      `,
    )
    .get(specialBudgetId, normalizedMonthKey) as { id: number } | undefined;

  if (!row) {
    throw new Error("Sonderbudget passt nicht zum ausgewaehlten Monat.");
  }
}

function normalizePlannedAmountCents(plannedAmountCents: number): number {
  if (!Number.isInteger(plannedAmountCents) || plannedAmountCents < 0) {
    throw new Error("Geplanter Betrag muss 0 oder groesser sein.");
  }

  return plannedAmountCents;
}

function normalizeNote(note: string): string | null {
  const normalized = note.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 240) {
    throw new Error("Notiz darf maximal 240 Zeichen enthalten.");
  }

  return normalized;
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getSelectableMonthKeys(baseDate: Date = new Date()): string[] {
  const months: string[] = [];
  const cursor = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

  for (let index = 0; index < 12; index += 1) {
    months.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function mapSpecialBudgetPersistenceError(error: unknown): Error {
  if (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed: special_budgets.name, special_budgets.month_key")
  ) {
    return new Error("Dieses Sonderbudget existiert im gewaehlten Monat bereits.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Sonderbudget konnte nicht gespeichert werden.");
}

export function listSpecialBudgets(): SpecialBudgetListItem[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          sb.id,
          sb.name,
          sb.month_key AS monthKey,
          sb.planned_amount_cents AS plannedAmountCents,
          sb.note,
          sb.is_active AS isActive,
          COALESCE(
            (
              SELECT ABS(SUM(t.amount_cents))
              FROM transactions t
              WHERE t.special_budget_id = sb.id
                AND t.transaction_type = 'expense'
            ),
            0
          ) AS actualExpenseCents
        FROM special_budgets sb
        ORDER BY sb.month_key ASC, sb.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{
    id: number;
    name: string;
    monthKey: string;
    plannedAmountCents: number;
    note: string | null;
    isActive: number;
    actualExpenseCents: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    monthKey: row.monthKey,
    plannedAmountCents: row.plannedAmountCents,
    note: row.note,
    isActive: mapSqliteBoolean(row.isActive),
    actualExpenseCents: row.actualExpenseCents,
  }));
}

export function createSpecialBudget(input: SpecialBudgetInput): void {
  const name = normalizeName(input.name);
  const monthKey = normalizeMonthKey(input.monthKey);
  const plannedAmountCents = normalizePlannedAmountCents(input.plannedAmountCents);
  const note = normalizeNote(input.note);

  try {
    getDb()
      .prepare(
        `
          INSERT INTO special_budgets (
            name,
            month_key,
            planned_amount_cents,
            note,
            is_active,
            updated_at
          )
          VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `,
      )
      .run(name, monthKey, plannedAmountCents, note);
  } catch (error) {
    throw mapSpecialBudgetPersistenceError(error);
  }
}

export function setSpecialBudgetActive(specialBudgetId: number, isActive: boolean): void {
  const result = getDb()
    .prepare(
      `
        UPDATE special_budgets
        SET
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(isActive ? 1 : 0, specialBudgetId);

  if (result.changes === 0) {
    throw new Error("Sonderbudget wurde nicht gefunden.");
  }
}

export function updateSpecialBudgetPlannedAmount(
  specialBudgetId: number,
  plannedAmountCents: number,
): void {
  const normalizedPlannedAmountCents = normalizePlannedAmountCents(plannedAmountCents);

  const result = getDb()
    .prepare(
      `
        UPDATE special_budgets
        SET
          planned_amount_cents = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(normalizedPlannedAmountCents, specialBudgetId);

  if (result.changes === 0) {
    throw new Error("Sonderbudget wurde nicht gefunden.");
  }
}

export function updateSpecialBudgetPlannedAmountForMonth(
  specialBudgetId: number,
  monthKey: string,
  plannedAmountCents: number,
): void {
  assertSpecialBudgetBelongsToMonth(specialBudgetId, monthKey);
  updateSpecialBudgetPlannedAmount(specialBudgetId, plannedAmountCents);
}

export function setSpecialBudgetActiveForMonth(
  specialBudgetId: number,
  monthKey: string,
  isActive: boolean,
): void {
  assertSpecialBudgetBelongsToMonth(specialBudgetId, monthKey);
  setSpecialBudgetActive(specialBudgetId, isActive);
}

export function listActiveSpecialBudgetOptions(monthKey: string): ActiveSpecialBudgetOption[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);

  const rows = getDb()
    .prepare(
      `
        SELECT
          id,
          name,
          month_key AS monthKey
        FROM special_budgets
        WHERE is_active = 1
          AND month_key = ?
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all(normalizedMonthKey) as ActiveSpecialBudgetOption[];

  return rows;
}
