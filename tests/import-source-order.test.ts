import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { persistSparkasseCsvImport } = await import("@/src/import/persistence");
const importRepository = await import("@/src/import/repository");
const monthsRepository = await import("@/src/months/repository");

const SAME_DAY_CSV = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"03.06.26";"03.06.26";"KARTENZAHLUNG";"CSV ERSTE BUCHUNG";"";"";"FIN114-001";"";"";"";"Haendler A";"DE00222222220000000002";"BANKDEFFXXX";"-10,00";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"03.06.26";"03.06.26";"KARTENZAHLUNG";"CSV ZWEITE BUCHUNG";"";"";"FIN114-002";"";"";"";"Haendler B";"DE00222222220000000003";"BANKDEFFXXX";"-20,00";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"03.06.26";"03.06.26";"KARTENZAHLUNG";"CSV DRITTE BUCHUNG";"";"";"FIN114-003";"";"";"";"Haendler C";"DE00222222220000000004";"BANKDEFFXXX";"-30,00";"EUR";"Umsatz gebucht"`;

describe("FIN-114 import source ordering", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("stores source row indexes and lists same-day imports in CSV order", () => {
    const result = persistSparkasseCsvImport({
      sourceFilename: "fin-114.csv",
      fileContent: SAME_DAY_CSV,
    });

    expect(result.importedRows).toBe(3);

    const storedSourceOrder = db
      .prepare(
        `
          SELECT source_row_index AS sourceRowIndex
          FROM imported_transactions
          WHERE import_run_id = ?
          ORDER BY source_row_index ASC
        `,
      )
      .all(result.importRunId) as Array<{ sourceRowIndex: number }>;

    expect(storedSourceOrder.map((row) => row.sourceRowIndex)).toEqual([0, 1, 2]);

    const imported = importRepository.listImportedTransactions();
    expect(imported.map((row) => row.description)).toEqual([
      "KARTENZAHLUNG | CSV ERSTE BUCHUNG",
      "KARTENZAHLUNG | CSV ZWEITE BUCHUNG",
      "KARTENZAHLUNG | CSV DRITTE BUCHUNG",
    ]);

    const month = monthsRepository.getMonthDetail("2026-06", "2026-06");
    expect(month.transactions.map((row) => row.description)).toEqual([
      "KARTENZAHLUNG | CSV ERSTE BUCHUNG",
      "KARTENZAHLUNG | CSV ZWEITE BUCHUNG",
      "KARTENZAHLUNG | CSV DRITTE BUCHUNG",
    ]);
  });
});
