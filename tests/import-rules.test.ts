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
      name: "Bali -> Sonderbudget",
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
      .filter((rule) => rule.name === "REWE -> Einkauf" || rule.name === "Bali -> Sonderbudget");
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
  });

  it("ships editable default N26 transfer candidate rule", () => {
    const rules = repo.listImportRules();
    const n26Rule = rules.find((rule) => rule.name === "N26 Transfer-Kandidat");

    expect(n26Rule).toBeDefined();
    expect(n26Rule?.name).toBe("N26 Transfer-Kandidat");
    expect(n26Rule?.pattern).toBe("N26-Fix.");
    expect(n26Rule?.matchField).toBe("description");
    expect(n26Rule?.targetType).toBe("transfer_cash");
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
    expect(suggestions[0].label).toBe("Transfer-Kandidat -> N26");
  });

  it("does not recreate N26 default rule after edits or deactivation", () => {
    const initial = repo.listImportRules().find((rule) => rule.name === "N26 Transfer-Kandidat");
    expect(initial).toBeDefined();

    repo.updateImportRule(initial!.id, {
      ...initial!,
      name: "N26 Transfer-Kandidat (angepasst)",
      pattern: "N26-ALT",
      isActive: false,
    });

    // Trigger table/bootstrap path again.
    const after = repo.listImportRules().filter((rule) => rule.name.includes("N26 Transfer-Kandidat"));

    expect(after).toHaveLength(1);
    expect(after[0].name).toBe("N26 Transfer-Kandidat (angepasst)");
    expect(after[0].pattern).toBe("N26-ALT");
    expect(after[0].isActive).toBe(false);
  });
});
