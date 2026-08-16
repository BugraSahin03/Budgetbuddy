import { readFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const {
  buildSparkasseImportRuleSuggestions,
  buildSparkasseImportPreviewPlan,
  detectDefaultImportMonthKey,
  persistSparkasseCsvImport,
} = await import("@/src/import/persistence");
const { parseSparkasseCsvToPreview } = await import("@/src/import/sparkasse-csv");
const { createImportRule, listActiveImportRules } = await import(
  "@/src/import-rules/repository"
);

const SAMPLE_CSV = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"24.04.26";"24.04.26";"DIG. KARTE (APPLE PAY)";"2026-04-23T20:21 Debitk.10 2029-12 ";"";"";"65134322015674230426202105";"";"";"";"SUPERMARKT A/STRASSE 1/STADT/DE";"DE00222222220000000002";"BANKDEFFXXX";"-3,58";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"25.04.26";"25.04.26";"BARGELDAUSZAHLUNG";"GA NR 12345678 AUTOMAT STADT";"";"";"ATM-202604251030";"";"";"";"SPARKASSE GELDAUTOMAT";"";"";"-50,00";"EUR";"Umsatz gebucht"
"DE00111111110000000001";"24.04.26";"24.04.26";"EINGANG";"Lohn April";"";"";"SALARY-202604";"";"";"";"Arbeitgeber GmbH";"DE00999999990000000009";"BANKDEFFXXX";"2500,00";"EUR";"Umsatz gebucht"`;

const CONFIGURED_CASH_TRANSFER_CSV = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"25.04.26";"25.04.26";"KARTENAUSZAHLUNG";"BANKTERMINAL INNENSTADT";"";"";"CASH-RULE-202604251030";"";"";"";"SPARKASSE FILIALE";"";"";"-40,00";"EUR";"Umsatz gebucht"`;

const PENDING_MIX_CSV = readFileSync(
  join(process.cwd(), "tests/fixtures/sparkasse-pending-anonymized.csv"),
  "utf8",
);

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

  it("persists configured cash transfer rule matches as transfers into cash balance", () => {
    createImportRule({
      name: "Filialauszahlung -> Bargeld",
      pattern: "BANKTERMINAL",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "cash_transfer",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 90,
    });

    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse-cash-rule.csv",
      fileContent: CONFIGURED_CASH_TRANSFER_CSV,
    });

    expect(result.importedRows).toBe(1);

    const cashAccount = db
      .prepare("SELECT id FROM accounts WHERE account_type = 'cash' AND name = 'Bargeld'")
      .get() as { id: number };

    const stored = db
      .prepare(
        `
          SELECT
            transaction_type AS transactionType,
            destination_account_id AS destinationAccountId,
            amount_cents AS amountCents
          FROM transactions
          WHERE import_run_id = ?
        `,
      )
      .get(result.importRunId) as {
      transactionType: string;
      destinationAccountId: number | null;
      amountCents: number;
    };

    expect(stored.transactionType).toBe("transfer");
    expect(stored.destinationAccountId).toBe(cashAccount.id);
    expect(stored.amountCents).toBe(-4000);

    const cashIncoming = db
      .prepare(
        `
          SELECT COALESCE(SUM(-amount_cents), 0) AS total
          FROM transactions
          WHERE destination_account_id = ?
            AND transaction_type = 'transfer'
        `,
      )
      .get(cashAccount.id) as { total: number };

    expect(cashIncoming.total).toBe(4000);
  });

  it("persists fixed-cost control rule matches as expenses with durable rule context", () => {
    createImportRule({
      name: "Garage Kontrolle",
      pattern: "GARAGE-FAMILIE",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 90,
    });

    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse-fixed-control.csv",
      fileContent: `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"25.04.26";"25.04.26";"UEBERWEISUNG";"GARAGE-FAMILIE SAHIN";"";"";"CONTROL-RULE-202604251030";"";"";"";"Familie Sahin";"";"";"-40,00";"EUR";"Umsatz gebucht"`,
    });

    expect(result.importedRows).toBe(1);

    const stored = db
      .prepare(
        `
          SELECT transaction_type AS transactionType, destination_account_id AS destinationAccountId
          FROM transactions
          WHERE import_run_id = ?
        `,
      )
      .get(result.importRunId) as {
      transactionType: string;
      destinationAccountId: number | null;
    };

    expect(stored.transactionType).toBe("expense");
    expect(stored.destinationAccountId).toBeNull();

    const control = db
      .prepare(
        `
          SELECT
            rule_name_snapshot AS ruleName,
            rule_pattern_snapshot AS rulePattern,
            rule_match_field_snapshot AS ruleMatchField
          FROM transaction_fixed_cost_control_matches control
          INNER JOIN transactions t ON t.id = control.transaction_id
          WHERE t.import_run_id = ?
        `,
      )
      .get(result.importRunId) as {
      ruleName: string;
      rulePattern: string;
      ruleMatchField: string;
    };

    expect(control).toEqual({
      ruleName: "Garage Kontrolle",
      rulePattern: "GARAGE-FAMILIE",
      ruleMatchField: "combined",
    });
  });

  it("rolls back the complete import batch when control-status persistence fails", () => {
    createImportRule({
      name: "Supermarkt Kontrolle",
      pattern: "SUPERMARKT A",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 5,
    });
    db.exec(`
      CREATE TRIGGER fail_fin126_control_insert
      BEFORE INSERT ON transaction_fixed_cost_control_matches
      BEGIN
        SELECT RAISE(ABORT, 'forced control persistence failure');
      END;
    `);

    expect(() =>
      persistSparkasseCsvImport({
        sourceFilename: "atomic-control.csv",
        fileContent: SAMPLE_CSV,
      }),
    ).toThrow("forced control persistence failure");

    const run = db
      .prepare(
        `
          SELECT id, status, imported_rows AS importedRows
          FROM import_runs
          WHERE source_filename = 'atomic-control.csv'
        `,
      )
      .get() as { id: number; status: string; importedRows: number };
    expect(run.status).toBe("failed");
    expect(run.importedRows).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE import_run_id = ?").get(
        run.id,
      ) as { count: number }).count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM imported_transactions WHERE import_run_id = ?").get(
        run.id,
      ) as { count: number }).count,
    ).toBe(0);
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

  it("builds a preview plan that separates new rows from duplicates", () => {
    const parsed = parseSparkasseCsvToPreview(SAMPLE_CSV);
    const firstPreview = buildSparkasseImportPreviewPlan({ rows: parsed.rows });

    expect(firstPreview.importableRowIndexes).toEqual([0, 1, 2]);
    expect(firstPreview.filteredRows).toEqual([]);
    expect(firstPreview.duplicateRows).toBe(0);

    persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    const secondPreview = buildSparkasseImportPreviewPlan({ rows: parsed.rows });

    expect(secondPreview.importableRowIndexes).toEqual([]);
    expect(secondPreview.duplicateRows).toBe(3);
    expect(secondPreview.filteredRows.map((row) => row.reasonLabel)).toEqual([
      "Duplikat",
      "Duplikat",
      "Duplikat",
    ]);
  });

  it("filters the verified six-pending two-booked mix before rules and persistence", () => {
    createImportRule({
      name: "Vormerkung darf nicht matchen",
      pattern: "ANONYMISIERTE VORMERKUNG",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "cash_transfer",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 1,
    });
    const parsed = parseSparkasseCsvToPreview(PENDING_MIX_CSV);
    const suggestions = buildSparkasseImportRuleSuggestions({
      rows: parsed.rows,
      rules: listActiveImportRules(),
    });
    const preview = buildSparkasseImportPreviewPlan({ rows: parsed.rows, suggestions });

    expect(suggestions.every((suggestion) => suggestion.rowIndex >= 6)).toBe(true);
    expect(preview.importableRowIndexes).toEqual([6, 7]);
    expect(preview.pendingRows).toBe(6);
    expect(preview.unknownStatusRows).toBe(0);
    expect(preview.duplicateRows).toBe(0);
    expect(preview.filteredRows.map((row) => row.reasonLabel)).toEqual(
      Array(6).fill("Vorgemerkt"),
    );

    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse-pending-mix.csv",
      fileContent: PENDING_MIX_CSV,
      effectiveMonthKey: "2026-08",
      previewPlan: preview,
    });

    expect(result).toMatchObject({
      detectedRows: 8,
      importedRows: 2,
      duplicateRows: 0,
      pendingRows: 6,
      unknownStatusRows: 0,
    });
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE import_run_id = ?").get(
        result.importRunId,
      ) as { count: number }).count,
    ).toBe(2);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM imported_transactions WHERE import_run_id = ?").get(
        result.importRunId,
      ) as { count: number }).count,
    ).toBe(2);
  });

  it("persists no rows or fingerprints for a pending-only file", () => {
    const lines = PENDING_MIX_CSV.trim().split(/\r?\n/);
    const pendingOnlyCsv = [lines[0], ...lines.slice(1, 7)].join("\n");
    const parsed = parseSparkasseCsvToPreview(pendingOnlyCsv);
    const preview = buildSparkasseImportPreviewPlan({ rows: parsed.rows });
    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse-pending-only.csv",
      fileContent: pendingOnlyCsv,
      effectiveMonthKey: "2026-08",
      previewPlan: preview,
    });

    expect(preview.importableRowIndexes).toEqual([]);
    expect(result.pendingRows).toBe(6);
    expect(result.importedRows).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as { count: number }).count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM imported_transactions").get() as { count: number })
        .count,
    ).toBe(0);
  });

  it("allows a pending payment to be imported after it becomes finally booked", () => {
    const lines = PENDING_MIX_CSV.trim().split(/\r?\n/);
    const pendingOnlyCsv = [lines[0], lines[1]].join("\n");
    const pendingResult = persistSparkasseCsvImport({
      sourceFilename: "pending-first.csv",
      fileContent: pendingOnlyCsv,
      effectiveMonthKey: "2026-08",
    });
    const bookedCsv = pendingOnlyCsv
      .replace('"16.08.26";;"KARTENZAHLUNG"', '"16.08.26";"16.08.26";"KARTENZAHLUNG"')
      .replace("Umsatz vorgemerkt", "Umsatz gebucht");
    const bookedResult = persistSparkasseCsvImport({
      sourceFilename: "booked-later.csv",
      fileContent: bookedCsv,
      effectiveMonthKey: "2026-08",
    });

    expect(pendingResult.pendingRows).toBe(1);
    expect(pendingResult.importedRows).toBe(0);
    expect(bookedResult.importedRows).toBe(1);
    expect(bookedResult.duplicateRows).toBe(0);
  });

  it("keeps unknown Info values visible and blocks them conservatively", () => {
    const csv = PENDING_MIX_CSV.replace("Umsatz vorgemerkt", "Status extern");
    const parsed = parseSparkasseCsvToPreview(csv);
    const preview = buildSparkasseImportPreviewPlan({ rows: parsed.rows });
    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse-unknown-status.csv",
      fileContent: csv,
      effectiveMonthKey: "2026-08",
      previewPlan: preview,
    });

    expect(preview.filteredRows[0]).toMatchObject({
      reason: "unknown_status",
      reasonLabel: "Unbekannter Status",
    });
    expect(preview.unknownStatusRows).toBe(1);
    expect(result.unknownStatusRows).toBe(1);
    expect(result.pendingRows).toBe(5);
    expect(result.importedRows).toBe(2);
  });

  it("lets duplicate status dominate rule suggestions in the preview plan", () => {
    const parsed = parseSparkasseCsvToPreview(SAMPLE_CSV);

    persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    const preview = buildSparkasseImportPreviewPlan({
      rows: parsed.rows,
      suggestions: [
        {
          rowIndex: 0,
          label: "Fixkosten-Kontrolle: Kontrollmuster",
          ruleName: "Fitness Kontrollregel",
          kind: "fixed_cost_control",
        },
      ],
    });

    expect(preview.filteredRows[0]).toMatchObject({
      rowIndex: 0,
      reason: "duplicate",
      reasonLabel: "Duplikat",
      suggestionLabel: "Fixkosten-Kontrolle: Kontrollmuster",
    });
  });

  it("keeps fixed-cost controls and transfer hints in the persistable preview list", () => {
    const parsed = parseSparkasseCsvToPreview(SAMPLE_CSV);
    const preview = buildSparkasseImportPreviewPlan({
      rows: parsed.rows,
      suggestions: [
        {
          rowIndex: 0,
          label: "Fixkosten-Kontrolle: Kontrollmuster",
          ruleName: "N26 Sammeltransfer Kontrolle",
          kind: "fixed_cost_control",
        },
        {
          rowIndex: 1,
          label: "Transfer -> Bargeld",
          ruleName: "Bargeldabhebung",
        },
      ],
    });

    expect(preview.importableRowIndexes).toEqual([0, 1, 2]);
    expect(preview.filteredRows).toEqual([]);
  });

  it("persists preview controls and cash transfers without losing either row", () => {
    createImportRule({
      name: "Supermarkt Fixkostenkontrolle",
      pattern: "SUPERMARKT A",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 5,
    });
    const parsed = parseSparkasseCsvToPreview(SAMPLE_CSV);
    const preview = buildSparkasseImportPreviewPlan({
      rows: parsed.rows,
      suggestions: [
        {
          rowIndex: 0,
          label: "Fixkosten-Kontrolle: Kontrollmuster",
          ruleName: "Supermarkt Fixkostenkontrolle",
          kind: "fixed_cost_control",
        },
        {
          rowIndex: 1,
          label: "Transfer -> Bargeld",
          ruleName: "Bargeldabhebung",
        },
      ],
    });

    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
      previewPlan: preview,
    });

    expect(result.detectedRows).toBe(3);
    expect(result.importedRows).toBe(3);
    expect(result.duplicateRows).toBe(0);

    const rows = db
      .prepare(
        `
          SELECT description, transaction_type AS transactionType
          FROM transactions
          WHERE source_type = 'import'
          ORDER BY id ASC
        `,
      )
      .all() as Array<{ description: string; transactionType: string }>;

    expect(rows.map((row) => row.description)).toEqual([
      "DIG. KARTE (APPLE PAY) | 2026-04-23T20:21 Debitk.10 2029-12",
      "BARGELDAUSZAHLUNG | GA NR 12345678 AUTOMAT STADT",
      "EINGANG | Lohn April",
    ]);
    expect(rows.some((row) => row.transactionType === "transfer")).toBe(true);
    expect(
      (
        db.prepare("SELECT COUNT(*) AS count FROM transaction_fixed_cost_control_matches").get() as {
          count: number;
        }
      ).count,
    ).toBe(1);
  });

  it("treats existing transaction fingerprints as duplicates even without metadata row", () => {
    persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });
    db.prepare("DELETE FROM imported_transactions").run();

    const second = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    expect(second.importedRows).toBe(0);
    expect(second.duplicateRows).toBe(3);

    const transactionCount = db
      .prepare("SELECT COUNT(*) AS count FROM transactions WHERE source_type = 'import'")
      .get() as { count: number };
    expect(transactionCount.count).toBe(3);
  });

  it("applies explicit target month to all imported rows", () => {
    const result = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
      effectiveMonthKey: "2026-05",
    });

    expect(result.importedRows).toBe(3);

    const rows = db
      .prepare(
        "SELECT effective_month_key AS effectiveMonthKey FROM transactions WHERE import_run_id = ?",
      )
      .all(result.importRunId) as Array<{ effectiveMonthKey: string }>;

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.effectiveMonthKey === "2026-05")).toBe(true);
  });

  it("blocks imports into closed months", () => {
    db.prepare(
      `
        INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
        VALUES ('2026-04', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    ).run();

    expect(() =>
      persistSparkasseCsvImport({
        sourceFilename: "sparkasse.csv",
        fileContent: SAMPLE_CSV,
      }),
    ).toThrow("Monat ist abgeschlossen und kann nicht bearbeitet werden.");

    const importRunCount = db
      .prepare("SELECT COUNT(*) AS count FROM import_runs")
      .get() as { count: number };
    expect(importRunCount.count).toBe(0);
  });

  it("rejects invalid target month format for import confirm", () => {
    expect(() =>
      persistSparkasseCsvImport({
        sourceFilename: "sparkasse.csv",
        fileContent: SAMPLE_CSV,
        effectiveMonthKey: "2026/04",
      }),
    ).toThrow("Zielmonat muss im Format YYYY-MM vorliegen.");
  });

  it("detects default target month from parsed booking rows", () => {
    const preview = persistSparkasseCsvImport({
      sourceFilename: "sparkasse.csv",
      fileContent: SAMPLE_CSV,
    });

    const rows = db
      .prepare(
        `
          SELECT booking_date AS bookingDate
          FROM transactions
          WHERE import_run_id = ?
          ORDER BY id ASC
        `,
      )
      .all(preview.importRunId) as Array<{ bookingDate: string }>;

    expect(detectDefaultImportMonthKey(rows)).toBe("2026-04");
  });
});
