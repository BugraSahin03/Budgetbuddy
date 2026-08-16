import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/src/db/client";
import {
  classifySparkasseBookingStatus,
  parseSparkasseCsvToPreview,
  type SparkasseCsvRow,
} from "@/src/import/sparkasse-csv";
import {
  isCashTransferRule,
  isN26FixedCostControlRule,
} from "@/src/import-rules/classification";
import {
  hasIncomeDeductionForMonth,
  listActiveIncomeDeductionRules,
  matchIncomeDeductionRule,
  type IncomeDeductionRule,
} from "@/src/import-rules/income-deductions";
import {
  buildImportRuleSuggestions,
  type ImportRuleSuggestion,
} from "@/src/import-rules/matcher";
import { listActiveImportRules, type ImportRule } from "@/src/import-rules/repository";
import { assertMonthIsOpen } from "@/src/months/status";

export type ImportPersistenceResult = {
  importRunId: number;
  detectedRows: number;
  importedRows: number;
  duplicateRows: number;
  pendingRows: number;
  unknownStatusRows: number;
  parseErrors: string[];
};

export type ImportPreviewFilteredReason = "duplicate" | "pending" | "unknown_status";

export type ImportPreviewFilteredRow = {
  rowIndex: number;
  reason: ImportPreviewFilteredReason;
  reasonLabel: string;
  ruleName: string | null;
  suggestionLabel: string | null;
};

export type ImportPreviewPlan = {
  importableRowIndexes: number[];
  incomeDeductionConflictRowIndexes: number[];
  filteredRows: ImportPreviewFilteredRow[];
  duplicateRows: number;
  pendingRows: number;
  unknownStatusRows: number;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeFingerprintPart(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildDedupeFingerprint(row: SparkasseCsvRow): string {
  const raw = [
    row.accountIban,
    row.bookingDate,
    row.valueDate,
    String(row.amountCents),
    row.counterparty,
    row.purpose,
    row.endToEndReference,
    row.mandateReference,
  ]
    .map(normalizeFingerprintPart)
    .join("|");

  return createHash("sha256").update(raw).digest("hex");
}

function findExistingDuplicateByFingerprint(dedupeFingerprint: string): boolean {
  const db = getDb();
  const alreadyImported = db
    .prepare(
      `
        SELECT id
        FROM imported_transactions
        WHERE dedupe_fingerprint = ?
        LIMIT 1
      `,
    )
    .get(dedupeFingerprint) as { id: number } | undefined;

  if (alreadyImported) {
    return true;
  }

  const alreadyPersistedTransaction = db
    .prepare(
      `
        SELECT id
        FROM transactions
        WHERE import_fingerprint = ?
        LIMIT 1
      `,
    )
    .get(dedupeFingerprint) as { id: number } | undefined;

  return Boolean(alreadyPersistedTransaction);
}

export function buildSparkasseImportRuleSuggestions(params: {
  rows: SparkasseCsvRow[];
  rules: ImportRule[];
  incomeDeductionRules?: IncomeDeductionRule[];
}): ImportRuleSuggestion[] {
  const bookedRows = params.rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => classifySparkasseBookingStatus(row.info) === "booked");
  const suggestions = buildImportRuleSuggestions({
    rows: bookedRows.map(({ row }) => row),
    rules: params.rules,
    incomeDeductionRules: params.incomeDeductionRules,
  });

  return suggestions.flatMap((suggestion) => {
    const source = bookedRows[suggestion.rowIndex];
    return source ? [{ ...suggestion, rowIndex: source.rowIndex }] : [];
  });
}

export function buildSparkasseImportPreviewPlan(params: {
  rows: SparkasseCsvRow[];
  suggestions?: ImportRuleSuggestion[];
  effectiveMonthKey?: string | null;
}): ImportPreviewPlan {
  const suggestionByRowIndex = new Map(
    (params.suggestions ?? []).map((suggestion) => [suggestion.rowIndex, suggestion]),
  );
  const seenFingerprints = new Set<string>();
  const importableRowIndexes: number[] = [];
  const incomeDeductionConflictRowIndexes: number[] = [];
  const filteredRows: ImportPreviewFilteredRow[] = [];
  const bookedRows = params.rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => classifySparkasseBookingStatus(row.info) === "booked");
  const bookedRowIndexes = new Set(bookedRows.map(({ rowIndex }) => rowIndex));
  const hasIncomeDeductionSuggestions = (params.suggestions ?? []).some(
    (suggestion) =>
      bookedRowIndexes.has(suggestion.rowIndex) && suggestion.kind === "income_deduction",
  );
  const monthKey = hasIncomeDeductionSuggestions
    ? resolveImportEffectiveMonthKey(
        params.effectiveMonthKey,
        bookedRows.map(({ row }) => row),
      )
    : null;
  let incomeDeductionReserved = monthKey
    ? hasIncomeDeductionForMonth(monthKey)
    : false;

  params.rows.forEach((row, rowIndex) => {
    const bookingStatus = classifySparkasseBookingStatus(row.info);

    if (bookingStatus !== "booked") {
      filteredRows.push({
        rowIndex,
        reason: bookingStatus === "pending" ? "pending" : "unknown_status",
        reasonLabel: bookingStatus === "pending" ? "Vorgemerkt" : "Unbekannter Status",
        ruleName: null,
        suggestionLabel: null,
      });
      return;
    }

    const dedupeFingerprint = buildDedupeFingerprint(row);
    const isDuplicate =
      seenFingerprints.has(dedupeFingerprint) ||
      findExistingDuplicateByFingerprint(dedupeFingerprint);
    const suggestion = suggestionByRowIndex.get(rowIndex);

    if (isDuplicate) {
      filteredRows.push({
        rowIndex,
        reason: "duplicate",
        reasonLabel: "Duplikat",
        ruleName: suggestion?.ruleName ?? null,
        suggestionLabel: suggestion?.label ?? null,
      });
      return;
    }

    seenFingerprints.add(dedupeFingerprint);

    if (suggestion?.kind === "income_deduction") {
      if (incomeDeductionReserved) {
        incomeDeductionConflictRowIndexes.push(rowIndex);
        importableRowIndexes.push(rowIndex);
        return;
      }

      incomeDeductionReserved = true;
    }

    importableRowIndexes.push(rowIndex);
  });

  return {
    importableRowIndexes,
    incomeDeductionConflictRowIndexes,
    filteredRows,
    duplicateRows: filteredRows.filter((row) => row.reason === "duplicate").length,
    pendingRows: filteredRows.filter((row) => row.reason === "pending").length,
    unknownStatusRows: filteredRows.filter((row) => row.reason === "unknown_status").length,
  };
}

function resolveSparkasseAccountId(): number {
  const account = getDb()
    .prepare(
      `
        SELECT id
        FROM accounts
        WHERE account_type = 'bank'
          AND name = 'Sparkasse'
        LIMIT 1
      `,
    )
    .get() as { id: number } | undefined;

  if (!account) {
    throw new Error("Sparkasse-Konto wurde nicht gefunden.");
  }

  return account.id;
}

function resolveCashAccountId(): number {
  const account = getDb()
    .prepare(
      `
        SELECT id
        FROM accounts
        WHERE account_type = 'cash'
          AND name = 'Bargeld'
        LIMIT 1
      `,
    )
    .get() as { id: number } | undefined;

  if (!account) {
    throw new Error("Bargeld-Konto wurde nicht gefunden.");
  }

  return account.id;
}

function isCashWithdrawalTransfer(row: SparkasseCsvRow): boolean {
  const probe = `${row.bookingText} ${row.purpose}`.toUpperCase();

  return (
    probe.includes("BARGELDAUSZAHLUNG") ||
    probe.includes("GELDAUTOMAT") ||
    probe.includes("GA NR") ||
    probe.includes(" ATM ")
  );
}

function normalizeRuleText(value: string): string {
  return value.trim().toUpperCase();
}

function getRuleMatchText(row: SparkasseCsvRow, matchField: ImportRule["matchField"]): string {
  if (matchField === "description") {
    return normalizeRuleText(row.description);
  }

  if (matchField === "counterparty") {
    return normalizeRuleText(row.counterparty);
  }

  return normalizeRuleText(`${row.description} ${row.counterparty}`);
}

function matchesCashTransferRule(row: SparkasseCsvRow, activeRules: ImportRule[]): boolean {
  if (row.amountCents >= 0) {
    return false;
  }

  return activeRules.filter(isCashTransferRule).some((rule) => {
    const needle = normalizeRuleText(rule.pattern);
    if (needle.length === 0) {
      return false;
    }

    return getRuleMatchText(row, rule.matchField).includes(needle);
  });
}

function toMonthKey(bookingDate: string): string {
  return bookingDate.slice(0, 7);
}

export function detectDefaultImportMonthKey(
  rows: Array<Pick<SparkasseCsvRow, "bookingDate">>,
): string | null {
  if (rows.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  const firstSeenIndex = new Map<string, number>();

  rows.forEach((row, index) => {
    const monthKey = toMonthKey(row.bookingDate);
    if (!MONTH_KEY_PATTERN.test(monthKey)) {
      return;
    }

    counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    if (!firstSeenIndex.has(monthKey)) {
      firstSeenIndex.set(monthKey, index);
    }
  });

  let selected: string | null = null;
  let selectedCount = -1;
  let selectedFirstSeen = Number.MAX_SAFE_INTEGER;

  for (const [monthKey, count] of counts.entries()) {
    const firstSeen = firstSeenIndex.get(monthKey) ?? Number.MAX_SAFE_INTEGER;

    if (count > selectedCount || (count === selectedCount && firstSeen < selectedFirstSeen)) {
      selected = monthKey;
      selectedCount = count;
      selectedFirstSeen = firstSeen;
    }
  }

  return selected;
}

export function resolveImportEffectiveMonthKey(
  rawMonthKey: string | null | undefined,
  rows: SparkasseCsvRow[],
): string {
  const normalized = (rawMonthKey ?? "").trim();

  if (normalized.length > 0) {
    if (!MONTH_KEY_PATTERN.test(normalized)) {
      throw new Error("Zielmonat muss im Format YYYY-MM vorliegen.");
    }

    return normalized;
  }

  const detected = detectDefaultImportMonthKey(rows);
  if (!detected) {
    throw new Error("Zielmonat konnte aus dem Import nicht abgeleitet werden.");
  }

  return detected;
}

function determineTransactionShape(params: {
  row: SparkasseCsvRow;
  activeRules: ImportRule[];
  isIncomeDeduction: boolean;
}): {
  transactionType: "expense" | "income" | "transfer" | "income_deduction";
  destinationAccountId: number | null;
} {
  const { row, activeRules } = params;

  if (params.isIncomeDeduction && row.amountCents < 0) {
    return {
      transactionType: "income_deduction",
      destinationAccountId: null,
    };
  }

  if (
    row.amountCents < 0 &&
    (isCashWithdrawalTransfer(row) || matchesCashTransferRule(row, activeRules))
  ) {
    return {
      transactionType: "transfer",
      destinationAccountId: resolveCashAccountId(),
    };
  }

  if (row.amountCents > 0) {
    return {
      transactionType: "income",
      destinationAccountId: null,
    };
  }

  return {
    transactionType: "expense",
    destinationAccountId: null,
  };
}

export function persistSparkasseCsvImport(params: {
  sourceFilename: string;
  fileContent: string;
  effectiveMonthKey?: string | null;
  previewPlan?: ImportPreviewPlan | null;
}): ImportPersistenceResult {
  const parseResult = parseSparkasseCsvToPreview(params.fileContent);
  const importEffectiveMonthKey = resolveImportEffectiveMonthKey(
    params.effectiveMonthKey,
    parseResult.rows.filter((row) => classifySparkasseBookingStatus(row.info) === "booked"),
  );
  assertMonthIsOpen(importEffectiveMonthKey);

  const db = getDb();
  const runInsert = db
    .prepare(
      `
        INSERT INTO import_runs (
          source_format,
          source_filename,
          status,
          detected_rows,
          imported_rows,
          duplicate_rows
        )
        VALUES ('sparkasse_csv', ?, 'pending', ?, 0, 0)
      `,
    )
    .run(params.sourceFilename, parseResult.rows.length);

  const importRunId = Number(runInsert.lastInsertRowid);
  let importedRows = 0;
  let duplicateRows = 0;
  let pendingRows = 0;
  let unknownStatusRows = 0;
  const sparkasseAccountId = resolveSparkasseAccountId();
  const previewFilteredRowByIndex = new Map(
    (params.previewPlan?.filteredRows ?? []).map((row) => [row.rowIndex, row]),
  );
  const incomeDeductionConflictRowIndexes = new Set(
    params.previewPlan?.incomeDeductionConflictRowIndexes ?? [],
  );
  const activeImportRules = listActiveImportRules();
  const activeIncomeDeductionRules = listActiveIncomeDeductionRules();
  const currentSuggestions = buildSparkasseImportRuleSuggestions({
    rows: parseResult.rows,
    rules: activeImportRules,
    incomeDeductionRules: activeIncomeDeductionRules,
  });
  const suggestionByRowIndex = new Map(
    currentSuggestions.map((suggestion) => [suggestion.rowIndex, suggestion]),
  );
  const activeImportRuleById = new Map(
    activeImportRules.map((rule) => [rule.id, rule]),
  );
  let incomeDeductionReserved = hasIncomeDeductionForMonth(importEffectiveMonthKey);

  const persistTransaction = db.transaction(() => {
    for (const [sourceRowIndex, row] of parseResult.rows.entries()) {
      const bookingStatus = classifySparkasseBookingStatus(row.info);

      if (bookingStatus === "pending") {
        pendingRows += 1;
        continue;
      }

      if (bookingStatus === "unknown") {
        unknownStatusRows += 1;
        continue;
      }

      const dedupeFingerprint = buildDedupeFingerprint(row);
      const previewFilteredRow = previewFilteredRowByIndex.get(sourceRowIndex);

      if (previewFilteredRow?.reason === "duplicate") {
        duplicateRows += 1;
        continue;
      }

      if (findExistingDuplicateByFingerprint(dedupeFingerprint)) {
        duplicateRows += 1;
        continue;
      }

      const suggestion = suggestionByRowIndex.get(sourceRowIndex);
      const matchesIncomeDeduction =
        suggestion?.kind === "income_deduction" ||
        Boolean(matchIncomeDeductionRule(row, activeIncomeDeductionRules));
      const isIncomeDeductionConflict =
        incomeDeductionConflictRowIndexes.has(sourceRowIndex) ||
        (matchesIncomeDeduction && incomeDeductionReserved);

      const shape = determineTransactionShape({
        row,
        activeRules: activeImportRules,
        isIncomeDeduction: matchesIncomeDeduction && !isIncomeDeductionConflict,
      });

      if (shape.transactionType === "income_deduction") {
        incomeDeductionReserved = true;
      }

      const transactionInsert = db
        .prepare(
          `
            INSERT INTO transactions (
              account_id,
              destination_account_id,
              transaction_type,
              booking_date,
              effective_month_key,
              value_date,
              amount_cents,
              currency_code,
              description,
              counterparty_name,
              counterparty_iban,
              source_type,
              import_run_id,
              import_fingerprint,
              category_id,
              special_budget_id,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', ?, ?, NULL, NULL, CURRENT_TIMESTAMP)
          `,
        )
        .run(
          sparkasseAccountId,
          shape.destinationAccountId,
          shape.transactionType,
          row.bookingDate,
          importEffectiveMonthKey,
          row.valueDate,
          row.amountCents,
          row.currencyCode,
          row.description,
          row.counterparty,
          row.counterpartyIban || null,
          importRunId,
          dedupeFingerprint,
        );

      const transactionId = Number(transactionInsert.lastInsertRowid);

      db.prepare(
        `
          INSERT INTO imported_transactions (
            transaction_id,
            import_run_id,
            source_row_index,
            account_iban,
            booking_date,
            value_date,
            amount_cents,
            counterparty,
            purpose,
            end_to_end_reference,
            mandate_reference,
            dedupe_fingerprint
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        transactionId,
        importRunId,
        sourceRowIndex,
        row.accountIban,
        row.bookingDate,
        row.valueDate,
        row.amountCents,
        row.counterparty,
        row.purpose || null,
        row.endToEndReference || null,
        row.mandateReference || null,
        dedupeFingerprint,
      );

      const fixedCostControlRule = suggestion?.ruleId
        ? activeImportRuleById.get(suggestion.ruleId)
        : undefined;
      if (
        shape.transactionType === "expense" &&
        suggestion?.kind === "fixed_cost_control" &&
        fixedCostControlRule &&
        isN26FixedCostControlRule(fixedCostControlRule)
      ) {
        db.prepare(
          `
            INSERT INTO transaction_fixed_cost_control_matches (
              transaction_id,
              import_rule_id,
              rule_name_snapshot,
              rule_pattern_snapshot,
              rule_match_field_snapshot
            )
            VALUES (?, ?, ?, ?, ?)
          `,
        ).run(
          transactionId,
          fixedCostControlRule.id,
          fixedCostControlRule.name,
          fixedCostControlRule.pattern,
          fixedCostControlRule.matchField,
        );
      }

      importedRows += 1;
    }
  });

  try {
    persistTransaction();

    db.prepare(
      `
        UPDATE import_runs
        SET
          status = 'completed',
          imported_rows = ?,
          duplicate_rows = ?,
          finished_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    ).run(importedRows, duplicateRows, importRunId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    importedRows = 0;

    db.prepare(
      `
        UPDATE import_runs
        SET
          status = 'failed',
          imported_rows = ?,
          duplicate_rows = ?,
          finished_at = CURRENT_TIMESTAMP,
          error_message = ?
        WHERE id = ?
      `,
    ).run(importedRows, duplicateRows, message, importRunId);

    throw error;
  }

  return {
    importRunId,
    detectedRows: parseResult.rows.length,
    importedRows,
    duplicateRows,
    pendingRows,
    unknownStatusRows,
    parseErrors: parseResult.errors,
  };
}
