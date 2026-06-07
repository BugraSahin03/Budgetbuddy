import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const aliases = await import("@/src/settings/import-display-aliases/repository");
const importRepository = await import("@/src/import/repository");
const monthsRepository = await import("@/src/months/repository");

describe("FIN-059 display names in import-backed lists", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns display names while preserving original transaction descriptions", () => {
    const accountId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse' LIMIT 1").get() as { id: number }
    ).id;

    const importRun = db
      .prepare(
        `
          INSERT INTO import_runs (source_format, source_filename, status, detected_rows, imported_rows)
          VALUES ('sparkasse_csv', 'test.csv', 'completed', 1, 1)
        `,
      )
      .run();
    const importRunId = Number(importRun.lastInsertRowid);

    const originalDescription =
      "FOLGELASTSCHRIFT | 028-7836718-2754737 AMZN Mktp DE 13X0LD9WC4FUA2SE";

    const transaction = db
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            import_run_id,
            import_fingerprint
          )
          VALUES (?, 'expense', '2026-06-03', '2026-06', -199, 'EUR', ?, 'import', ?, 'fin059-amzn')
        `,
      )
      .run(accountId, originalDescription, importRunId);
    const transactionId = Number(transaction.lastInsertRowid);

    db.prepare(
      `
        INSERT INTO imported_transactions (
          transaction_id,
          import_run_id,
          account_iban,
          booking_date,
          amount_cents,
          counterparty,
          purpose,
          dedupe_fingerprint
        )
        VALUES (?, ?, 'DE001', '2026-06-03', -199, 'AMZN', 'Marketplace', 'fin059-dedupe')
      `,
    ).run(transactionId, importRunId);

    aliases.createImportDisplayAlias({ pattern: "AMZN", displayName: "Amazon" });

    const imported = importRepository.listImportedTransactions();
    expect(imported[0].description).toBe(originalDescription);
    expect(imported[0].displayName).toBe("Amazon");

    const month = monthsRepository.getMonthDetail("2026-06");
    expect(month.transactions[0].description).toBe(originalDescription);
    expect(month.transactions[0].displayName).toBe("Amazon");
  });
});
