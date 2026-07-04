import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-079 import rule settings UI", () => {
  it("exposes control pattern recognition as a dedicated settings area next to aliases", () => {
    const settingsPage = readProjectFile("app/einstellungen/page.tsx");
    const importRulesPage = readProjectFile("app/einstellungen/import-regeln/page.tsx");
    const cashTransferRulesPage = readProjectFile(
      "app/einstellungen/bargeld-transferregeln/page.tsx",
    );
    const settingsActions = readProjectFile("app/einstellungen/actions.ts");

    expect(settingsPage).toContain("Kontrollmuster Fixkostenerkennung");
    expect(settingsPage).toContain('href: "/einstellungen/import-regeln"');
    expect(settingsPage).toContain("Bargeld- und Transferregeln");
    expect(settingsPage).toContain('href: "/einstellungen/bargeld-transferregeln"');
    expect(settingsPage).toContain("Import-Aliasse");
    expect(importRulesPage).toContain("Import-Erkennung");
    expect(importRulesPage).toContain("Kontrollmuster Fixkostenerkennung");
    expect(importRulesPage).toContain("Fixkosten-Kontrolltreffer");
    expect(importRulesPage).toContain("N26-Fix.");
    expect(importRulesPage).toContain("N26-Sammeltransfer als Fixkosten-Kontrolle");
    expect(importRulesPage).toContain("createImportRuleSettingsAction");
    expect(importRulesPage).toContain("updateImportRuleSettingsAction");
    expect(importRulesPage).toContain("isN26FixedCostControlRule");
    expect(importRulesPage).toContain('name="pattern"');
    expect(importRulesPage).toContain('name="matchField"');
    expect(importRulesPage).toContain('name="isActive"');
    expect(importRulesPage).not.toContain('name="targetType"');
    expect(importRulesPage).not.toContain('name="categoryId"');
    expect(importRulesPage).not.toContain('name="specialBudgetId"');
    expect(importRulesPage).not.toContain("Sonderkategorie</option>");
    expect(importRulesPage).not.toContain("Kategorie</option>");
    expect(importRulesPage).not.toContain("Bargeld-Transfer / Fixkosten-Kontrolle");
    expect(cashTransferRulesPage).toContain("Bargeld- und Transferregeln");
    expect(cashTransferRulesPage).toContain("Transfer -&gt; Bargeld");
    expect(cashTransferRulesPage).toContain("isCashTransferRule");
    expect(cashTransferRulesPage).toContain("createCashTransferRuleSettingsAction");
    expect(cashTransferRulesPage).toContain("updateCashTransferRuleSettingsAction");
    expect(cashTransferRulesPage).toContain("deleteCashTransferRuleSettingsAction");
    expect(cashTransferRulesPage).toContain("Bargeld-Transfer ·");
    expect(cashTransferRulesPage).toContain("Gefahr-Aktion");
    expect(cashTransferRulesPage).toContain('name="confirmDelete"');
    expect(cashTransferRulesPage).toContain("Regel löschen");
    expect(cashTransferRulesPage).not.toContain("N26-Sammeltransfer als Fixkosten-Kontrolle");
    expect(settingsActions).toContain("createImportRuleSettingsAction");
    expect(settingsActions).toContain("updateImportRuleSettingsAction");
    expect(settingsActions).toContain("createCashTransferRuleSettingsAction");
    expect(settingsActions).toContain("updateCashTransferRuleSettingsAction");
    expect(settingsActions).toContain("deleteCashTransferRuleSettingsAction");
    expect(settingsActions).toContain('normalizedFormData.set("targetType", "transfer_cash")');
    expect(settingsActions).toContain('normalizedFormData.set("rulePurpose", "fixed_cost_control")');
    expect(settingsActions).toContain('normalizedFormData.set("rulePurpose", "cash_transfer")');
    expect(settingsActions).toContain('normalizedFormData.delete("categoryId")');
    expect(settingsActions).toContain('normalizedFormData.delete("specialBudgetId")');
    expect(settingsActions).toContain("/einstellungen/import-regeln");
  });

  it("keeps the CSV import page free of primary rule maintenance", () => {
    const importPage = readProjectFile("app/import/page.tsx");
    const importActions = readProjectFile("app/import/actions.ts");

    expect(importPage).toContain("Sparkassen-CSV Vorschau");
    expect(importPage).toContain("ImportForm");
    expect(importPage).not.toContain("Import-Regel anlegen");
    expect(importPage).not.toContain("Vorhandene Regeln");
    expect(importPage).not.toContain("createImportRuleAction");
    expect(importPage).not.toContain("updateImportRuleAction");
    expect(importActions).not.toContain("createImportRuleAction");
    expect(importActions).not.toContain("updateImportRuleAction");
    expect(importActions).not.toContain("/import?notice=Import-Regel");
  });
});
