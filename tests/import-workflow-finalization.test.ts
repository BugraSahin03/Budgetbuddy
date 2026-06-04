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
"DE00111111110000000001";"25.04.26";"25.04.26";"BARGELDAUSZAHLUNG";"GA NR 12345678 AUTOMAT STADT";"";"";"ATM-202604251030";"";"";"";"SPARKASSE GELDAUTOMAT";"";"";"-50,00";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"26.04.26";"26.04.26";"UEBERWEISUNG";"N26-Fix. Monatsblock";"";"";"N26-202604260900";"";"";"";"N26 BANK";"DE00333333330000000003";"NTSBDEB1XXX";"-40,00";"EUR";"Umsatz gebucht"`;

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
    formData.set("effectiveMonthKey", "2026-05");
    formData.set("sparkasseCsv", new File([SAMPLE_CSV], "sparkasse.csv", { type: "text/csv" }));

    const state = await parseSparkasseCsvAction(importPreviewInitialState, formData);

    expect(state.fatalError).toBeNull();
    expect(state.persisted).not.toBeNull();
    expect(state.persisted?.importedRows).toBe(3);
    expect(state.detectedMonthKey).toBe("2026-04");
    expect(
      state.suggestions.some(
        (suggestion) => suggestion.label === "Fixkosten-Kontrolle: N26-Sammeltransfer",
      ),
    ).toBe(true);

    const imported = listImportedTransactions();
    expect(imported).toHaveLength(3);
    expect(imported.some((row) => row.transactionType === "transfer")).toBe(true);
    expect(imported.some((row) => row.transactionType === "expense")).toBe(true);
    expect(
      imported.some(
        (row) =>
          row.description.includes("N26-Fix.") &&
          row.transactionType === "expense" &&
          row.destinationAccountName === null,
      ),
    ).toBe(true);

    const importedMonths = db
      .prepare(
        "SELECT DISTINCT effective_month_key AS effectiveMonthKey FROM transactions WHERE source_type = 'import'",
      )
      .all() as Array<{ effectiveMonthKey: string }>;
    expect(importedMonths).toEqual([{ effectiveMonthKey: "2026-05" }]);
  });

  it("confirms a loaded preview without selecting the file again", async () => {
    const previewFormData = new FormData();
    previewFormData.set("intent", "preview");
    previewFormData.set("effectiveMonthKey", "2026-05");
    previewFormData.set(
      "sparkasseCsv",
      new File([SAMPLE_CSV], "sparkasse.csv", { type: "text/csv" }),
    );

    const previewState = await parseSparkasseCsvAction(
      importPreviewInitialState,
      previewFormData,
    );

    expect(previewState.fatalError).toBeNull();
    expect(previewState.result?.rows).toHaveLength(3);
    expect(previewState.previewFileToken).toEqual(expect.any(String));
    expect(previewState.previewFilename).toBe("sparkasse.csv");

    const confirmFormData = new FormData();
    confirmFormData.set("intent", "confirm");
    confirmFormData.set("effectiveMonthKey", "2026-05");

    const confirmedState = await parseSparkasseCsvAction(previewState, confirmFormData);

    expect(confirmedState.fatalError).toBeNull();
    expect(confirmedState.persisted?.importedRows).toBe(3);
    expect(confirmedState.persisted?.duplicateRows).toBe(0);
    expect(confirmedState.previewFileToken).toBeNull();
  });

  it("counts preview-confirm re-imports as duplicates without raw constraint error", async () => {
    const firstFormData = new FormData();
    firstFormData.set("intent", "confirm");
    firstFormData.set("effectiveMonthKey", "2026-05");
    firstFormData.set(
      "sparkasseCsv",
      new File([SAMPLE_CSV], "sparkasse.csv", { type: "text/csv" }),
    );

    await parseSparkasseCsvAction(importPreviewInitialState, firstFormData);

    const previewFormData = new FormData();
    previewFormData.set("intent", "preview");
    previewFormData.set("effectiveMonthKey", "2026-05");
    previewFormData.set(
      "sparkasseCsv",
      new File([SAMPLE_CSV], "sparkasse.csv", { type: "text/csv" }),
    );

    const previewState = await parseSparkasseCsvAction(
      importPreviewInitialState,
      previewFormData,
    );
    const confirmFormData = new FormData();
    confirmFormData.set("intent", "confirm");
    confirmFormData.set("effectiveMonthKey", "2026-05");

    const confirmedState = await parseSparkasseCsvAction(previewState, confirmFormData);

    expect(confirmedState.fatalError).toBeNull();
    expect(confirmedState.persisted?.importedRows).toBe(0);
    expect(confirmedState.persisted?.duplicateRows).toBe(3);
  });

  it("shows validation error for invalid explicit target month", async () => {
    const formData = new FormData();
    formData.set("intent", "confirm");
    formData.set("effectiveMonthKey", "2026/05");
    formData.set("sparkasseCsv", new File([SAMPLE_CSV], "sparkasse.csv", { type: "text/csv" }));

    const state = await parseSparkasseCsvAction(importPreviewInitialState, formData);

    expect(state.persisted).toBeNull();
    expect(state.fatalError).toBe("Zielmonat muss im Format YYYY-MM vorliegen.");
  });
});
