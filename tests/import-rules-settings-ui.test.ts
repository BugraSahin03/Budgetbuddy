import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-079 import rule settings UI", () => {
  it("exposes import rules as a dedicated settings area next to aliases", () => {
    const settingsPage = readProjectFile("app/einstellungen/page.tsx");
    const importRulesPage = readProjectFile("app/einstellungen/import-regeln/page.tsx");
    const settingsActions = readProjectFile("app/einstellungen/actions.ts");

    expect(settingsPage).toContain("Import-Regeln");
    expect(settingsPage).toContain('href: "/einstellungen/import-regeln"');
    expect(settingsPage).toContain("Import-Aliasse");
    expect(importRulesPage).toContain("Import-Erkennung");
    expect(importRulesPage).toContain("Import-Regeln");
    expect(importRulesPage).toContain("Import-Aliasse bleiben separat");
    expect(importRulesPage).toContain("N26-Fix.");
    expect(importRulesPage).toContain("Bargeld-Transfer / Fixkosten-Kontrolle");
    expect(importRulesPage).toContain("createImportRuleSettingsAction");
    expect(importRulesPage).toContain("updateImportRuleSettingsAction");
    expect(importRulesPage).toContain('name="pattern"');
    expect(importRulesPage).toContain('name="matchField"');
    expect(importRulesPage).toContain('name="targetType"');
    expect(importRulesPage).toContain('name="isActive"');
    expect(settingsActions).toContain("createImportRuleSettingsAction");
    expect(settingsActions).toContain("updateImportRuleSettingsAction");
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
