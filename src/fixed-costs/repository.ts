import "server-only";

import { getDb } from "@/src/db/client";
import { buildImportRuleSuggestions } from "@/src/import-rules/matcher";
import { listActiveImportRules } from "@/src/import-rules/repository";
import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";

export type FixedCostListItem = {
  id: number;
  name: string;
  plannedAmountCents: number;
  bookingDayOfMonth: number | null;
  paymentNote: string | null;
  note: string | null;
  isActive: boolean;
  sortOrder: number;
  monthlyAssignmentCount: number;
};

export type FixedCostInput = {
  name: string;
  plannedAmountInput: string;
  bookingDayOfMonthInput: string;
  paymentNote: string;
  note: string;
};

export type FixedCostControlMatchItem = {
  transactionId: number;
  bookingDate: string;
  description: string;
  counterpartyName: string | null;
  amountCents: number;
  importRunId: number | null;
  controlLabel: string;
  ruleName: string;
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
    throw new Error("Betrag ist ungültig formatiert.");
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Betrag muss 0 oder größer sein.");
  }

  const cents = Math.round(parsed * 100);

  if (cents > 99_999_999) {
    throw new Error("Betrag ist zu groß.");
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
          fc.sort_order AS sortOrder,
          0 AS monthlyAssignmentCount
        FROM fixed_costs fc
        ORDER BY fc.is_active DESC, fc.sort_order ASC, fc.name COLLATE NOCASE ASC, fc.id ASC
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
    sortOrder: number;
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
    sortOrder: row.sortOrder,
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
            sort_order,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, 1,
            (SELECT COALESCE(MAX(sort_order), 0) + 1000 FROM fixed_costs),
            CURRENT_TIMESTAMP
          )
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
    throw new Error("Fixkosten-ID ist ungültig.");
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
    throw new Error("Fixkosten-ID ist ungültig.");
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

export function updateFixedCostSortOrder(fixedCostIds: number[]): void {
  ensureRuntimeTables();

  const normalizedIds = fixedCostIds.map((fixedCostId) => {
    const id = Number.parseInt(String(fixedCostId), 10);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Fixkosten-ID ist ungültig.");
    }

    return id;
  });
  const uniqueIds = new Set(normalizedIds);

  if (uniqueIds.size !== normalizedIds.length) {
    throw new Error("Fixkosten-Reihenfolge enthält doppelte Einträge.");
  }

  const db = getDb();
  const transaction = db.transaction((ids: number[]) => {
    const update = db.prepare(
      `
        UPDATE fixed_costs
        SET
          sort_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    );

    ids.forEach((id, index) => {
      const result = update.run((index + 1) * 1000, id);

      if (result.changes === 0) {
        throw new Error("Fixkosten-Eintrag wurde nicht gefunden.");
      }
    });
  });

  transaction(normalizedIds);
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

function toMatcherRow(row: {
  bookingDate: string;
  description: string;
  counterpartyName: string | null;
  amountCents: number;
}): SparkasseCsvRow {
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

export function listFixedCostControlMatches(limit = 120): FixedCostControlMatchItem[] {
  ensureRuntimeTables();

  const importedExpenseRows = getDb()
    .prepare(
      `
        SELECT
          t.id AS transactionId,
          t.booking_date AS bookingDate,
          t.description,
          t.counterparty_name AS counterpartyName,
          t.amount_cents AS amountCents,
          t.import_run_id AS importRunId
        FROM transactions t
        WHERE t.source_type = 'import'
          AND t.transaction_type = 'expense'
        ORDER BY t.booking_date DESC, t.id DESC
        LIMIT ?
      `,
    )
    .all(limit) as Array<{
    transactionId: number;
    bookingDate: string;
    description: string;
    counterpartyName: string | null;
    amountCents: number;
    importRunId: number | null;
  }>;

  if (importedExpenseRows.length === 0) {
    return [];
  }

  const rules = listActiveImportRules();
  const fixedCosts = listFixedCosts().filter((row) => row.isActive);
  const suggestions = buildImportRuleSuggestions({
    rows: importedExpenseRows.map(toMatcherRow),
    rules,
    fixedCosts,
  });

  const byIndex = new Map<number, { label: string; ruleName: string }>();
  for (const suggestion of suggestions) {
    if (!suggestion.label.startsWith("Fixkosten-Kontrolle:")) {
      continue;
    }
    if (!byIndex.has(suggestion.rowIndex)) {
      byIndex.set(suggestion.rowIndex, {
        label: suggestion.label,
        ruleName: suggestion.ruleName,
      });
    }
  }

  const result: FixedCostControlMatchItem[] = [];
  for (let index = 0; index < importedExpenseRows.length; index += 1) {
    const suggestion = byIndex.get(index);
    if (!suggestion) {
      continue;
    }
    const row = importedExpenseRows[index];
    result.push({
      transactionId: row.transactionId,
      bookingDate: row.bookingDate,
      description: row.description,
      counterpartyName: row.counterpartyName,
      amountCents: row.amountCents,
      importRunId: row.importRunId,
      controlLabel: suggestion.label,
      ruleName: suggestion.ruleName,
    });
  }

  return result;
}
