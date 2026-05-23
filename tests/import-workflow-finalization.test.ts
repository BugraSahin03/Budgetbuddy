import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { parseSparkasseCsvAction } = await import("@/app/import/actions");
const { importPreviewInitialState } = await import("@/app/import/state");
const { listImportedTransactions } = await import("@/src/import/repository");

const SAMPLE_CSV = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"24.04.26";"24.04.26";"DIG. KARTE (APPLE PAY)";"2026-04-23T20:21 Debitk.10 2029-12 ";"";"";"65134322015674230426202105";"";"";"";"SUPERMARKT A";"DE00222222220000000002";"BANKDEFFXXX";"-3,58";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"25.04.26";"25.04.26";"BARGELDAUSZAHLUNG";"GA NR 12345678 AUTOMAT STADT";"";"";"ATM-202604251030";"";"";"";"SPARKASSE GELDAUTOMAT";"";"";"-50,00";"EUR";"Umsatz gebucht"`;

describe("import workflow finalization", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("confirms import and persists rows", async () => {
    const formData = new FormData();
    formData.set("intent", "confirm");
    formData.set("sparkasseCsv", new File([SAMPLE_CSV], "sparkasse.csv", { type: "text/csv" }));

    const state = await parseSparkasseCsvAction(importPreviewInitialState, formData);

    expect(state.fatalError).toBeNull();
    expect(state.persisted).not.toBeNull();
    expect(state.persisted?.importedRows).toBe(2);

    const imported = listImportedTransactions();
    expect(imported).toHaveLength(2);
    expect(imported.some((row) => row.transactionType === "transfer")).toBe(true);
    expect(imported.some((row) => row.transactionType === "expense")).toBe(true);
  });
});
