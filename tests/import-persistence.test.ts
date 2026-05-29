import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { persistSparkasseCsvImport } = await import("@/src/import/persistence");

const SAMPLE_CSV = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"24.04.26";"24.04.26";"DIG. KARTE (APPLE PAY)";"2026-04-23T20:21 Debitk.10 2029-12 ";"";"";"65134322015674230426202105";"";"";"";"SUPERMARKT A/STRASSE 1/STADT/DE";"DE00222222220000000002";"BANKDEFFXXX";"-3,58";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"25.04.26";"25.04.26";"BARGELDAUSZAHLUNG";"GA NR 12345678 AUTOMAT STADT";"";"";"ATM-202604251030";"";"";"";"SPARKASSE GELDAUTOMAT";"";"";"-50,00";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"24.04.26";"24.04.26";"EINGANG";"Lohn April";"";"";"SALARY-202604";"";"";"";"Arbeitgeber GmbH";"DE00999999990000000009";"BANKDEFFXXX";"2500,00";"EUR";"Umsatz gebucht"`;

describe("import persistence and dedupe", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates import run, persists rows and updates counters", () => {
    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    expect(result.detectedRows).toBe(3);
    expect(result.importedRows).toBe(3);
    expect(result.duplicateRows).toBe(0);

    const run = db
      .prepare(
        "SELECT status, detected_rows AS detectedRows, imported_rows AS importedRows, duplicate_rows AS duplicateRows FROM import_runs WHERE id = ?",
      )
      .get(result.importRunId) as {
      status: string;
      detectedRows: number;
      importedRows: number;
      duplicateRows: number;
    };

    expect(run.status).toBe("completed");
    expect(run.detectedRows).toBe(3);
    expect(run.importedRows).toBe(3);
    expect(run.duplicateRows).toBe(0);

    const txTypes = db
      .prepare(
        `
          SELECT transaction_type AS transactionType, destination_account_id AS destinationAccountId
               , effective_month_key AS effectiveMonthKey
          FROM transactions
          WHERE source_type = 'import'
          ORDER BY id ASC
        `,
      )
      .all() as Array<{
      transactionType: string;
      destinationAccountId: number | null;
      effectiveMonthKey: string;
    }>;

    expect(txTypes).toHaveLength(3);
    expect(txTypes.some((tx) => tx.transactionType === "expense")).toBe(true);
    expect(
      txTypes.some((tx) => tx.transactionType === "transfer" && tx.destinationAccountId !== null),
    ).toBe(true);
    expect(txTypes.some((tx) => tx.transactionType === "income")).toBe(true);
    expect(txTypes.every((tx) => tx.effectiveMonthKey === "2026-04")).toBe(true);
  });

  it("marks second identical import as duplicates", () => {
    const first = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    const second = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    expect(first.importedRows).toBe(3);
    expect(second.importedRows).toBe(0);
    expect(second.duplicateRows).toBe(3);

    const importCount = db
      .prepare("SELECT COUNT(*) AS count FROM imported_transactions")
      .get() as { count: number };
    expect(importCount.count).toBe(3);
  });
});
