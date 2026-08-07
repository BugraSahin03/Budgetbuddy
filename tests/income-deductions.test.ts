import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({ getDb: () => db }));

const rules = await import("@/src/import-rules/income-deductions");
const matcher = await import("@/src/import-rules/matcher");
const persistence = await import("@/src/import/persistence");
const months = await import("@/src/months/repository");
const transactions = await import("@/src/transactions/repository");

const HEADER = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"`;
const INCOME_DEDUCTION_CSV = `${HEADER}
"DE001";"02.07.26";"02.07.26";"LASTSCHRIFT";"Beitrag Juli";"";"";"PKV-1";"";"";"";"PRIVATE KRANKENVERSICHERUNG";"DE002";"BANKDEFF";"-300,00";"EUR";"Umsatz gebucht"`;
const TWO_DEDUCTIONS_CSV = `${HEADER}
"DE001";"02.07.26";"02.07.26";"LASTSCHRIFT";"Beitrag Juli";"";"";"PKV-1";"";"";"";"PRIVATE KRANKENVERSICHERUNG";"DE002";"BANKDEFF";"-300,00";"EUR";"Umsatz gebucht"
"DE001";"03.07.26";"03.07.26";"LASTSCHRIFT";"Zusatzbeitrag";"";"";"PKV-2";"";"";"";"PRIVATE KRANKENVERSICHERUNG";"DE002";"BANKDEFF";"-50,00";"EUR";"Umsatz gebucht"`;

describe("FIN-120 income deductions", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
    rules.createIncomeDeductionRule({
      name: "PKV Sena",
      pattern: "PRIVATE KRANKENVERSICHERUNG",
      matchField: "counterparty",
      isActive: true,
      priority: 10,
    });
  });

  afterEach(() => db.close());

  it("creates, updates and deletes rules", () => {
    const created = rules.listIncomeDeductionRules()[0];
    expect(created.name).toBe("PKV Sena");

    rules.updateIncomeDeductionRule(created.id, { ...created, pattern: "PKV NEU", isActive: false });
    expect(rules.listActiveIncomeDeductionRules()).toEqual([]);

    rules.deleteIncomeDeductionRule(created.id);
    expect(rules.listIncomeDeductionRules()).toEqual([]);
  });

  it("matches a negative bank row as income deduction before other suggestions", () => {
    const parsed = persistence.detectDefaultImportMonthKey;
    expect(parsed).toBeTypeOf("function");
    const row = {
      accountIban: "DE001", bookingDate: "2026-07-02", valueDate: "2026-07-02",
      bookingText: "LASTSCHRIFT", purpose: "Beitrag", counterparty: "PRIVATE KRANKENVERSICHERUNG",
      counterpartyIban: "DE002", counterpartyBic: "BANKDEFF", amountCents: -30000,
      currencyCode: "EUR", info: "", endToEndReference: "PKV-1", mandateReference: "",
      description: "LASTSCHRIFT | Beitrag",
    };
    const suggestions = matcher.buildImportRuleSuggestions({
      rows: [row], rules: [], incomeDeductionRules: rules.listActiveIncomeDeductionRules(),
    });

    expect(suggestions).toEqual([{ rowIndex: 0, label: "Einkommensabzug", ruleName: "PKV Sena", kind: "income_deduction" }]);
  });

  it("persists one deduction, reduces net income and excludes it from expenses", async () => {
    const sparkasse = db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'").get() as { id: number };
    db.prepare(`INSERT INTO transactions (account_id, transaction_type, booking_date, effective_month_key, amount_cents, currency_code, description, source_type) VALUES (?, 'income', '2026-07-01', '2026-07', 200000, 'EUR', 'Gehalt', 'manual')`).run(sparkasse.id);

    const parsed = (await import("@/src/import/sparkasse-csv")).parseSparkasseCsvToPreview(INCOME_DEDUCTION_CSV);
    const suggestions = matcher.buildImportRuleSuggestions({ rows: parsed.rows, rules: [], incomeDeductionRules: rules.listActiveIncomeDeductionRules() });
    const previewPlan = persistence.buildSparkasseImportPreviewPlan({ rows: parsed.rows, suggestions, effectiveMonthKey: "2026-07" });
    persistence.persistSparkasseCsvImport({ sourceFilename: "pkv.csv", fileContent: INCOME_DEDUCTION_CSV, effectiveMonthKey: "2026-07", previewPlan });

    const snapshot = months.getMonthSnapshot("2026-07");
    expect(snapshot.totals.grossIncomeCents).toBe(200000);
    expect(snapshot.totals.incomeDeductionCents).toBe(30000);
    expect(snapshot.totals.incomeCents).toBe(170000);
    expect(snapshot.totals.expenseCents).toBe(0);
    expect(snapshot.transactions[0].transactionType).toBe("income_deduction");
    expect(snapshot.transactions[0].categoryId).toBeNull();
  });

  it("allows only the first deduction per month and exposes the second as conflict", async () => {
    const parsed = (await import("@/src/import/sparkasse-csv")).parseSparkasseCsvToPreview(TWO_DEDUCTIONS_CSV);
    const suggestions = matcher.buildImportRuleSuggestions({ rows: parsed.rows, rules: [], incomeDeductionRules: rules.listActiveIncomeDeductionRules() });
    const plan = persistence.buildSparkasseImportPreviewPlan({ rows: parsed.rows, suggestions, effectiveMonthKey: "2026-07" });

    expect(plan.importableRowIndexes).toEqual([0, 1]);
    expect(plan.incomeDeductionConflictRowIndexes).toEqual([1]);

    persistence.persistSparkasseCsvImport({ sourceFilename: "pkv.csv", fileContent: TWO_DEDUCTIONS_CSV, effectiveMonthKey: "2026-07", previewPlan: plan });
    expect((db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE transaction_type = 'income_deduction'").get() as { count: number }).count).toBe(1);
    expect((db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE transaction_type = 'expense'").get() as { count: number }).count).toBe(1);
  });

  it("blocks a matching row in a later import for the same month", async () => {
    const parser = await import("@/src/import/sparkasse-csv");
    const firstRows = parser.parseSparkasseCsvToPreview(INCOME_DEDUCTION_CSV).rows;
    const firstSuggestions = matcher.buildImportRuleSuggestions({
      rows: firstRows,
      rules: [],
      incomeDeductionRules: rules.listActiveIncomeDeductionRules(),
    });
    const firstPlan = persistence.buildSparkasseImportPreviewPlan({
      rows: firstRows,
      suggestions: firstSuggestions,
      effectiveMonthKey: "2026-07",
    });
    persistence.persistSparkasseCsvImport({
      sourceFilename: "pkv-1.csv",
      fileContent: INCOME_DEDUCTION_CSV,
      effectiveMonthKey: "2026-07",
      previewPlan: firstPlan,
    });

    const secondCsv = TWO_DEDUCTIONS_CSV.split("\n").slice(0, 1).concat(
      TWO_DEDUCTIONS_CSV.split("\n").slice(2),
    ).join("\n");
    const secondRows = parser.parseSparkasseCsvToPreview(secondCsv).rows;
    const secondSuggestions = matcher.buildImportRuleSuggestions({
      rows: secondRows,
      rules: [],
      incomeDeductionRules: rules.listActiveIncomeDeductionRules(),
    });
    const secondPlan = persistence.buildSparkasseImportPreviewPlan({
      rows: secondRows,
      suggestions: secondSuggestions,
      effectiveMonthKey: "2026-07",
    });

    expect(secondPlan.importableRowIndexes).toEqual([0]);
    expect(secondPlan.incomeDeductionConflictRowIndexes).toEqual([0]);

    persistence.persistSparkasseCsvImport({
      sourceFilename: "pkv-2.csv",
      fileContent: secondCsv,
      effectiveMonthKey: "2026-07",
      previewPlan: secondPlan,
    });
    expect((db.prepare("SELECT transaction_type AS type FROM transactions WHERE description LIKE '%Zusatzbeitrag%'").get() as { type: string }).type).toBe("expense");
  });

  it("lets the user take back a deduction without deleting the imported bank row", async () => {
    const parser = await import("@/src/import/sparkasse-csv");
    const rows = parser.parseSparkasseCsvToPreview(INCOME_DEDUCTION_CSV).rows;
    const suggestions = matcher.buildImportRuleSuggestions({
      rows,
      rules: [],
      incomeDeductionRules: rules.listActiveIncomeDeductionRules(),
    });
    const previewPlan = persistence.buildSparkasseImportPreviewPlan({
      rows,
      suggestions,
      effectiveMonthKey: "2026-07",
    });
    persistence.persistSparkasseCsvImport({
      sourceFilename: "pkv.csv",
      fileContent: INCOME_DEDUCTION_CSV,
      effectiveMonthKey: "2026-07",
      previewPlan,
    });
    const stored = db.prepare("SELECT id FROM transactions WHERE transaction_type = 'income_deduction'").get() as { id: number };

    transactions.reclassifyIncomeDeductionAsExpenseForMonth(stored.id, "2026-07");

    const row = db.prepare(`
      SELECT t.transaction_type AS type, t.category_id AS categoryId, it.transaction_id AS importedTransactionId
      FROM transactions t
      INNER JOIN imported_transactions it ON it.transaction_id = t.id
      WHERE t.id = ?
    `).get(stored.id) as { type: string; categoryId: number | null; importedTransactionId: number };
    expect(row).toEqual({ type: "expense", categoryId: null, importedTransactionId: stored.id });
    expect(rules.hasIncomeDeductionForMonth("2026-07")).toBe(false);
  });

  it("keeps duplicate filtering ahead of the monthly deduction conflict", async () => {
    const parser = await import("@/src/import/sparkasse-csv");
    const rows = parser.parseSparkasseCsvToPreview(INCOME_DEDUCTION_CSV).rows;
    const suggestions = matcher.buildImportRuleSuggestions({
      rows,
      rules: [],
      incomeDeductionRules: rules.listActiveIncomeDeductionRules(),
    });
    const firstPlan = persistence.buildSparkasseImportPreviewPlan({ rows, suggestions, effectiveMonthKey: "2026-07" });
    persistence.persistSparkasseCsvImport({ sourceFilename: "pkv.csv", fileContent: INCOME_DEDUCTION_CSV, effectiveMonthKey: "2026-07", previewPlan: firstPlan });

    const duplicatePlan = persistence.buildSparkasseImportPreviewPlan({ rows, suggestions, effectiveMonthKey: "2026-07" });
    expect(duplicatePlan.importableRowIndexes).toEqual([]);
    expect(duplicatePlan.incomeDeductionConflictRowIndexes).toEqual([]);
    expect(duplicatePlan.filteredRows[0]).toMatchObject({ reason: "duplicate", reasonLabel: "Duplikat" });
  });
});
