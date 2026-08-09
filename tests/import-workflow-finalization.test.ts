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
    vi.useRealTimers();
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
    expect(state.persisted?.detectedRows).toBe(3);
    expect(state.persisted?.importedRows).toBe(3);
    expect(state.persisted?.duplicateRows).toBe(0);
    expect(state.detectedMonthKey).toBe("2026-04");
    expect(
      state.suggestions.some(
        (suggestion) => suggestion.label === "Fixkosten-Kontrolle: Kontrollmuster",
      ),
    ).toBe(true);
    expect(state.previewPlan?.importableRowIndexes).toEqual([0, 1, 2]);
    expect(state.previewPlan?.filteredRows).toEqual([]);

    const imported = listImportedTransactions();
    expect(imported).toHaveLength(3);
    expect(imported.some((row) => row.transactionType === "transfer")).toBe(true);
    expect(imported.some((row) => row.transactionType === "expense")).toBe(true);
    expect(
      imported.some(
        (row) => row.description.includes("N26-Fix."),
      ),
    ).toBe(true);
    expect(
      (
        db.prepare("SELECT COUNT(*) AS count FROM transaction_fixed_cost_control_matches").get() as {
          count: number;
        }
      ).count,
    ).toBe(1);

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
    expect(previewState.previewPlan?.importableRowIndexes).toEqual([0, 1, 2]);
    expect(previewState.previewPlan?.filteredRows).toEqual([]);
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
    expect(confirmedState.previewPlan?.filteredRows).toEqual([
      expect.objectContaining({ rowIndex: 0, reason: "duplicate" }),
      expect.objectContaining({ rowIndex: 1, reason: "duplicate" }),
      expect.objectContaining({ rowIndex: 2, reason: "duplicate" }),
    ]);
  });

  it("keeps anonymous rent normal without a rule and persists Garage-AK as a visible control", async () => {
    const fixedCosts = await import("@/src/fixed-costs/repository");
    const importRules = await import("@/src/import-rules/repository");
    const months = await import("@/src/months/repository");
    fixedCosts.createFixedCost({
      name: "Miete Musterhaushalt",
      plannedAmountInput: "1430,00",
      bookingDayOfMonthInput: "1",
      paymentNote: "MIETE-MUSTER",
      note: "",
    });
    fixedCosts.createFixedCost({
      name: "Garage Musterhaushalt",
      plannedAmountInput: "60,00",
      bookingDayOfMonthInput: "2",
      paymentNote: "GARAGE-AK",
      note: "",
    });
    importRules.createImportRule({
      name: "Garage-AK Fixkostenkontrolle",
      pattern: "GARAGE-AK",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 5,
    });

    const csv = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"01.08.26";"01.08.26";"DAUERAUFTRAG";"MIETE-MUSTER";"";"";"ANON-RENT-202608";"";"";"";"Muster Hausverwaltung";"";"";"-1.430,00";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"02.08.26";"02.08.26";"LASTSCHRIFT";"GARAGE-AK";"";"";"ANON-GARAGE-202608";"";"";"";"Muster Stellplatz";"";"";"-60,00";"EUR";"Umsatz gebucht"`;
    const formData = new FormData();
    formData.set("intent", "confirm");
    formData.set("effectiveMonthKey", "2026-08");
    formData.set("sparkasseCsv", new File([csv], "anonymized-august.csv", { type: "text/csv" }));

    const state = await parseSparkasseCsvAction(importPreviewInitialState, formData);

    expect(state.fatalError).toBeNull();
    expect(state.persisted).toMatchObject({
      detectedRows: 2,
      importedRows: 2,
      duplicateRows: 0,
    });
    expect(state.previewPlan?.importableRowIndexes).toEqual([0, 1]);
    expect(state.previewPlan?.filteredRows).toEqual([]);
    expect(state.suggestions).toEqual([
      expect.objectContaining({
        rowIndex: 1,
        kind: "fixed_cost_control",
        ruleName: "Garage-AK Fixkostenkontrolle",
      }),
    ]);

    const month = months.getMonthSnapshot("2026-08");
    expect(month.fixedCostControlMatches).toEqual([
      expect.objectContaining({
        controlAmountCents: 6000,
        ruleName: "Garage-AK Fixkostenkontrolle",
        controlSource: "automatic",
      }),
    ]);
    expect(month.totals.actualFixedCostsCents).toBe(6000);
    expect(month.totals.expenseCents).toBe(143000);
    expect(month.totals.currentBudgetCents).toBe(-149000);
    expect(month.transactions.map((row) => row.description)).toEqual([
      "DAUERAUFTRAG | MIETE-MUSTER",
    ]);

    const garageRule = importRules
      .listActiveImportRules()
      .find((rule) => rule.name === "Garage-AK Fixkostenkontrolle");
    expect(garageRule).toBeDefined();
    importRules.updateImportRule(garageRule!.id, {
      name: "Garage-AK geaenderte Kontrolle",
      pattern: "NEUES-MUSTER",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: false,
      priority: 5,
    });

    const historicalMonth = months.getMonthSnapshot("2026-08");
    expect(historicalMonth.fixedCostControlMatches).toEqual([
      expect.objectContaining({
        controlAmountCents: 6000,
        ruleName: "Garage-AK Fixkostenkontrolle",
      }),
    ]);
    expect(historicalMonth.totals.expenseCents).toBe(143000);
    expect(historicalMonth.totals.currentBudgetCents).toBe(
      month.totals.currentBudgetCents,
    );
  });

  it("expires cached preview files and asks for a fresh CSV without raw errors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T10:00:00Z"));

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
    expect(previewState.previewFileToken).toEqual(expect.any(String));

    vi.setSystemTime(new Date("2026-05-01T10:11:00Z"));

    const confirmFormData = new FormData();
    confirmFormData.set("intent", "confirm");
    confirmFormData.set("effectiveMonthKey", "2026-05");

    const expiredState = await parseSparkasseCsvAction(previewState, confirmFormData);

    expect(expiredState.persisted).toBeNull();
    expect(expiredState.previewFileToken).toBeNull();
    expect(expiredState.fatalError).toBe(
      "Die geladene Vorschau ist abgelaufen. Bitte die CSV-Datei erneut auswählen.",
    );
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
