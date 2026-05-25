import "server-only";

import { getDb } from "@/src/db/client";

export type FixedCostListItem = {
  id: number;
  name: string;
  plannedAmountCents: number;
  bookingDayOfMonth: number | null;
  paymentNote: string | null;
  note: string | null;
  isActive: boolean;
  monthlyAssignmentCount: number;
};

export type FixedCostInput = {
  name: string;
  plannedAmountInput: string;
  bookingDayOfMonthInput: string;
  paymentNote: string;
  note: string;
};

export type FixedCostAssignmentItem = {
  transactionId: number;
  bookingDate: string;
  description: string;
  amountCents: number;
  accountName: string;
  fixedCostId: number | null;
  fixedCostName: string | null;
  effectiveMonthKey: string | null;
};

const AMOUNT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

function ensureRuntimeTables(): void {
  getDb()
    .prepare(
      `
        INSERT INTO app_meta (key, value)
        VALUES ('fixed_cost_assignment_mode', 'deprecated')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
    )
    .run();
}

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

function parseAmountCents(plannedAmountInput: string): number {
  const normalized = plannedAmountInput.trim();

  if (normalized.length === 0) {
    throw new Error("Betrag ist erforderlich.");
  }

  if (!AMOUNT_PATTERN.test(normalized)) {
    throw new Error("Betrag ist ungueltig formatiert.");
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Betrag muss 0 oder groesser sein.");
  }

  const cents = Math.round(parsed * 100);

  if (cents > 99_999_999) {
    throw new Error("Betrag ist zu gross.");
  }

  return cents;
}

function parseBookingDayOfMonth(bookingDayOfMonthInput: string): number | null {
  const normalized = bookingDayOfMonthInput.trim();

  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    throw new Error("Abbuchungstag muss zwischen 1 und 31 liegen.");
  }

  return parsed;
}

function normalizeOptionalText(value: string, maxLength: number, label: string): string | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} darf maximal ${maxLength} Zeichen enthalten.`);
  }

  return normalized;
}

export function listFixedCosts(): FixedCostListItem[] {
  ensureRuntimeTables();

  const rows = getDb()
    .prepare(
      `
        SELECT
          fc.id,
          fc.name,
          fc.planned_amount_cents AS plannedAmountCents,
          fc.booking_day_of_month AS bookingDayOfMonth,
          fc.payment_note AS paymentNote,
          fc.note,
          fc.is_active AS isActive,
          0 AS monthlyAssignmentCount
        FROM fixed_costs fc
        ORDER BY fc.is_active DESC, fc.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{
    id: number;
    name: string;
    plannedAmountCents: number;
    bookingDayOfMonth: number | null;
    paymentNote: string | null;
    note: string | null;
    isActive: number;
    monthlyAssignmentCount: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    plannedAmountCents: row.plannedAmountCents,
    bookingDayOfMonth: row.bookingDayOfMonth,
    paymentNote: row.paymentNote,
    note: row.note,
    isActive: mapSqliteBoolean(row.isActive),
    monthlyAssignmentCount: row.monthlyAssignmentCount,
  }));
}

export function createFixedCost(input: FixedCostInput): void {
  ensureRuntimeTables();

  const name = normalizeName(input.name);
  const plannedAmountCents = parseAmountCents(input.plannedAmountInput);
  const bookingDayOfMonth = parseBookingDayOfMonth(input.bookingDayOfMonthInput);
  const paymentNote = normalizeOptionalText(input.paymentNote, 60, "Abbuchungsinfo");
  const note = normalizeOptionalText(input.note, 240, "Notiz");

  try {
    getDb()
      .prepare(
        `
          INSERT INTO fixed_costs (
            name,
            planned_amount_cents,
            booking_day_of_month,
            payment_note,
            note,
            is_active,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `,
      )
      .run(name, plannedAmountCents, bookingDayOfMonth, paymentNote, note);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: fixed_costs.name")) {
      throw new Error("Fixkosten-Name existiert bereits.");
    }

    throw error;
  }
}

export function updateFixedCost(fixedCostId: number, input: FixedCostInput): void {
  ensureRuntimeTables();

  const id = Number.parseInt(String(fixedCostId), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Fixkosten-ID ist ungueltig.");
  }

  const name = normalizeName(input.name);
  const plannedAmountCents = parseAmountCents(input.plannedAmountInput);
  const bookingDayOfMonth = parseBookingDayOfMonth(input.bookingDayOfMonthInput);
  const paymentNote = normalizeOptionalText(input.paymentNote, 60, "Abbuchungsinfo");
  const note = normalizeOptionalText(input.note, 240, "Notiz");

  const result = getDb()
    .prepare(
      `
        UPDATE fixed_costs
        SET
          name = ?,
          planned_amount_cents = ?,
          booking_day_of_month = ?,
          payment_note = ?,
          note = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(name, plannedAmountCents, bookingDayOfMonth, paymentNote, note, id);

  if (result.changes === 0) {
    throw new Error("Fixkosten-Eintrag wurde nicht gefunden.");
  }
}

export function setFixedCostActive(fixedCostId: number, isActive: boolean): void {
  ensureRuntimeTables();

  const id = Number.parseInt(String(fixedCostId), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Fixkosten-ID ist ungueltig.");
  }

  const result = getDb()
    .prepare(
      `
        UPDATE fixed_costs
        SET
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(isActive ? 1 : 0, id);

  if (result.changes === 0) {
    throw new Error("Fixkosten-Eintrag wurde nicht gefunden.");
  }
}

export function getFixedCostsSummary(): { activeCount: number; plannedTotalCents: number } {
  ensureRuntimeTables();

  const row = getDb()
    .prepare(
      `
        SELECT
          COUNT(*) AS activeCount,
          COALESCE(SUM(planned_amount_cents), 0) AS plannedTotalCents
        FROM fixed_costs
        WHERE is_active = 1
      `,
    )
    .get() as { activeCount: number; plannedTotalCents: number };

  return row;
}

export function listExpenseTransactionsForFixedCostAssignment(limit = 80): FixedCostAssignmentItem[] {
  ensureRuntimeTables();

  return getDb()
    .prepare(
      `
        SELECT
          t.id AS transactionId,
          t.booking_date AS bookingDate,
          t.description,
          t.amount_cents AS amountCents,
          source.name AS accountName,
          NULL AS fixedCostId,
          NULL AS fixedCostName,
          NULL AS effectiveMonthKey
        FROM transactions t
        INNER JOIN accounts source ON source.id = t.account_id
        WHERE t.source_type = 'manual'
          AND t.transaction_type = 'expense'
        ORDER BY t.booking_date DESC, t.id DESC
        LIMIT ?
      `,
    )
    .all(limit) as FixedCostAssignmentItem[];
}

export function assignTransactionToFixedCost(
  _transactionId: number,
  _fixedCostId: number,
  _effectiveMonthKeyInput: string,
): void {
  ensureRuntimeTables();
  void _transactionId;
  void _fixedCostId;
  void _effectiveMonthKeyInput;
  throw new Error("Manuelle Fixkosten-Transaktionszuordnung ist im Monatsblock-Modell deaktiviert.");
}

export function unassignTransactionFromFixedCost(_transactionId: number): void {
  ensureRuntimeTables();
  void _transactionId;
  throw new Error("Manuelle Fixkosten-Transaktionszuordnung ist im Monatsblock-Modell deaktiviert.");
}
