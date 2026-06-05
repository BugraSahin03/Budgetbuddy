import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/src/db/client";
import { parseSparkasseCsvToPreview, type SparkasseCsvRow } from "@/src/import/sparkasse-csv";

export type ImportPersistenceResult = {
  importRunId: number;
  detectedRows: number;
  importedRows: number;
  duplicateRows: number;
  parseErrors: string[];
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

function resolveImportEffectiveMonthKey(
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

function determineTransactionShape(row: SparkasseCsvRow): {
  transactionType: "expense" | "income" | "transfer";
  destinationAccountId: number | null;
} {
  if (row.amountCents < 0 && isCashWithdrawalTransfer(row)) {
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
}): ImportPersistenceResult {
  const parseResult = parseSparkasseCsvToPreview(params.fileContent);
  const importEffectiveMonthKey = resolveImportEffectiveMonthKey(
    params.effectiveMonthKey,
    parseResult.rows,
  );

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
  const sparkasseAccountId = resolveSparkasseAccountId();

  const persistTransaction = db.transaction(() => {
    for (const row of parseResult.rows) {
      const dedupeFingerprint = buildDedupeFingerprint(row);

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

      if (alreadyImported || alreadyPersistedTransaction) {
        duplicateRows += 1;
        continue;
      }

      const shape = determineTransactionShape(row);

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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        transactionId,
        importRunId,
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
    parseErrors: parseResult.errors,
  };
}
