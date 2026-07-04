import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const repo = await import("@/src/import-rules/repository");
const matcher = await import("@/src/import-rules/matcher");

describe("import rules", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates and updates category/special/transfer rules", () => {
    const einkaufId = (
      db.prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1").get() as { id: number }
    ).id;

    const specialBudgetInsert = db
      .prepare(
        `
          INSERT INTO special_budgets (name, month_key, planned_amount_cents, is_active)
          VALUES ('Raspberry Pi', '2026-05', 10000, 1)
        `,
      )
      .run();
    const specialBudgetId = Number(specialBudgetInsert.lastInsertRowid);

    repo.createImportRule({
      name: "REWE -> Einkauf",
      pattern: "REWE",
      matchField: "combined",
      targetType: "category",
      categoryId: einkaufId,
      specialBudgetId: null,
      isActive: true,
      priority: 10,
    });

    repo.createImportRule({
      name: "Bali -> Sonderkategorie",
      pattern: "BALI",
      matchField: "description",
      targetType: "special_budget",
      categoryId: null,
      specialBudgetId,
      isActive: true,
      priority: 20,
    });

    const rules = repo
      .listImportRules()
      .filter((rule) => rule.name === "REWE -> Einkauf" || rule.name === "Bali -> Sonderkategorie");
    expect(rules).toHaveLength(2);

    repo.updateImportRule(rules[0].id, {
      ...rules[0],
      name: "REWE Einkauf aktiv",
      pattern: "REWE SAGT DANKE",
    });

    const updated = repo.listImportRules().find((rule) => rule.id === rules[0].id);
    expect(updated?.name).toBe("REWE Einkauf aktiv");
    expect(updated?.pattern).toBe("REWE SAGT DANKE");
  });

  it("builds suggestions and supports transfer cash rule", () => {
    repo.createImportRule({
      name: "ATM -> Bargeld Transfer",
      pattern: "BARGELDAUSZAHLUNG",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: "cash_transfer",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 5,
    });

    const suggestions = matcher.buildImportRuleSuggestions({
      rules: repo.listActiveImportRules(),
      rows: [
        {
          accountIban: "DE001",
          bookingDate: "2026-05-23",
          valueDate: "2026-05-23",
          bookingText: "BARGELDAUSZAHLUNG",
          purpose: "GA NR 1234",
          counterparty: "SPARKASSE GELDAUTOMAT",
          counterpartyIban: "",
          counterpartyBic: "",
          amountCents: -5000,
          currencyCode: "EUR",
          info: "Umsatz gebucht",
          endToEndReference: "",
          mandateReference: "",
          description: "BARGELDAUSZAHLUNG | GA NR 1234",
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe("Transfer -> Bargeld");
    expect(suggestions[0].ruleName).toBe("ATM -> Bargeld Transfer");
  });

  it("deletes cash transfer rules and excludes them from future matching", () => {
    repo.createImportRule({
      name: "Garage -> Bargeld Transfer",
      pattern: "GARAGE",
      matchField: "combined",
      targetType: "transfer_cash",
      rulePurpose: "cash_transfer",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 5,
    });

    const created = repo
      .listImportRules()
      .find((rule) => rule.name === "Garage -> Bargeld Transfer");
    expect(created).toBeDefined();

    repo.deleteCashTransferImportRule(created!.id);

    const afterDelete = repo
      .listImportRules()
      .find((rule) => rule.name === "Garage -> Bargeld Transfer");
    expect(afterDelete).toBeUndefined();

    const suggestions = matcher.buildImportRuleSuggestions({
      rules: repo.listActiveImportRules(),
      rows: [
        {
          accountIban: "DE001",
          bookingDate: "2026-05-23",
          valueDate: "2026-05-23",
          bookingText: "UEBERWEISUNG",
          purpose: "GARAGE",
          counterparty: "Familie Sahin",
          counterpartyIban: "",
          counterpartyBic: "",
          amountCents: -5000,
          currencyCode: "EUR",
          info: "Umsatz gebucht",
          endToEndReference: "",
          mandateReference: "",
          description: "UEBERWEISUNG | GARAGE",
        },
      ],
    });

    expect(suggestions).toHaveLength(0);
  });

  it("does not delete fixed-cost control rules through the cash transfer delete path", () => {
    const n26Rule = repo
      .listImportRules()
      .find((rule) => rule.name === "N26 Sammeltransfer Kontrolle");
    expect(n26Rule).toBeDefined();

    expect(() => repo.deleteCashTransferImportRule(n26Rule!.id)).toThrow(
      "Bargeld-/Transferregel wurde nicht gefunden.",
    );

    const stillExisting = repo.listImportRules().find((rule) => rule.id === n26Rule!.id);
    expect(stillExisting?.rulePurpose).toBe("fixed_cost_control");
  });

  it("ships editable default N26 control rule", () => {
    const rules = repo.listImportRules();
    const n26Rule = rules.find((rule) => rule.name === "N26 Sammeltransfer Kontrolle");

    expect(n26Rule).toBeDefined();
    expect(n26Rule?.name).toBe("N26 Sammeltransfer Kontrolle");
    expect(n26Rule?.pattern).toBe("N26-Fix.");
    expect(n26Rule?.matchField).toBe("description");
    expect(n26Rule?.targetType).toBe("transfer_cash");
    expect(n26Rule?.rulePurpose).toBe("fixed_cost_control");
    expect(n26Rule?.isActive).toBe(true);

    const suggestions = matcher.buildImportRuleSuggestions({
      rules: repo.listActiveImportRules(),
      rows: [
        {
          accountIban: "DE001",
          bookingDate: "2026-05-23",
          valueDate: "2026-05-23",
          bookingText: "UEBERWEISUNG",
          purpose: "N26-Fix. Monatsblock",
          counterparty: "N26 BANK",
          counterpartyIban: "",
          counterpartyBic: "",
          amountCents: -4000,
          currencyCode: "EUR",
          info: "Umsatz gebucht",
          endToEndReference: "",
          mandateReference: "",
          description: "UEBERWEISUNG | N26-Fix. Monatsblock",
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe("Fixkosten-Kontrolle: Kontrollmuster");
    expect(suggestions[0].ruleName).toBe("N26 Sammeltransfer Kontrolle");
  });

  it("keeps edited fixed-cost control rules separate from cash transfer rules", () => {
    const initial = repo
      .listImportRules()
      .find((rule) => rule.name === "N26 Sammeltransfer Kontrolle");
    expect(initial).toBeDefined();

    repo.updateImportRule(initial!.id, {
      ...initial!,
      name: "Garage Kontrolle",
      pattern: "GARAGE-FAMILIE",
      rulePurpose: "fixed_cost_control",
      isActive: true,
    });

    const suggestions = matcher.buildImportRuleSuggestions({
      rules: repo.listActiveImportRules(),
      rows: [
        {
          accountIban: "DE001",
          bookingDate: "2026-05-23",
          valueDate: "2026-05-23",
          bookingText: "UEBERWEISUNG",
          purpose: "GARAGE-FAMILIE SAHIN",
          counterparty: "Familie Sahin",
          counterpartyIban: "",
          counterpartyBic: "",
          amountCents: -4000,
          currencyCode: "EUR",
          info: "Umsatz gebucht",
          endToEndReference: "",
          mandateReference: "",
          description: "UEBERWEISUNG | GARAGE-FAMILIE SAHIN",
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe("Fixkosten-Kontrolle: Kontrollmuster");
    expect(suggestions[0].ruleName).toBe("Garage Kontrolle");
  });

  it("recognizes direct fixed-cost debit as control hit", async () => {
    const fixedCosts = await import("@/src/fixed-costs/repository");
    fixedCosts.createFixedCost({
      name: "Fitness Studio",
      plannedAmountInput: "29,99",
      bookingDayOfMonthInput: "2",
      paymentNote: "FITNESS STUDIO",
      note: "",
    });

    const suggestions = matcher.buildImportRuleSuggestions({
      rules: repo
        .listActiveImportRules()
        .filter((rule) => rule.name !== "N26 Sammeltransfer Kontrolle"),
      fixedCosts: fixedCosts.listFixedCosts(),
      rows: [
        {
          accountIban: "DE001",
          bookingDate: "2026-05-02",
          valueDate: "2026-05-02",
          bookingText: "LASTSCHRIFT",
          purpose: "Mitgliedsbeitrag",
          counterparty: "FITNESS STUDIO",
          counterpartyIban: "",
          counterpartyBic: "",
          amountCents: -2999,
          currencyCode: "EUR",
          info: "Umsatz gebucht",
          endToEndReference: "",
          mandateReference: "",
          description: "LASTSCHRIFT | Mitgliedsbeitrag",
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe(
      "Fixkosten-Kontrolle: Direktabbuchung (Fitness Studio)",
    );
  });

  it("does not recreate N26 default rule after edits or deactivation", () => {
    const initial = repo
      .listImportRules()
      .find((rule) => rule.name === "N26 Sammeltransfer Kontrolle");
    expect(initial).toBeDefined();

    repo.updateImportRule(initial!.id, {
      ...initial!,
      name: "N26 Sammeltransfer Kontrolle (angepasst)",
      pattern: "N26-ALT",
      isActive: false,
    });

    // Trigger table/bootstrap path again.
    const after = repo
      .listImportRules()
      .filter((rule) => rule.name.includes("N26 Sammeltransfer Kontrolle"));

    expect(after).toHaveLength(1);
    expect(after[0].name).toBe("N26 Sammeltransfer Kontrolle (angepasst)");
    expect(after[0].pattern).toBe("N26-ALT");
    expect(after[0].isActive).toBe(false);
  });
});
