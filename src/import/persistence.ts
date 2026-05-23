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
}): ImportPersistenceResult {
  const parseResult = parseSparkasseCsvToPreview(params.fileContent);

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

      if (alreadyImported) {
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', ?, ?, NULL, NULL, CURRENT_TIMESTAMP)
          `,
        )
        .run(
          sparkasseAccountId,
          shape.destinationAccountId,
          shape.transactionType,
          row.bookingDate,
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
