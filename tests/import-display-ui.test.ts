import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-059 import display alias UI", () => {
  it("keeps import display aliases in a dedicated settings tab and separate from import rules", () => {
    const settingsPage = readProjectFile("app/einstellungen/page.tsx");
    const importAliasesPage = readProjectFile("app/einstellungen/import-aliase/page.tsx");
    const settingsActions = readProjectFile("app/einstellungen/actions.ts");

    expect(settingsPage).toContain("Import-Aliasse");
    expect(settingsPage).toContain('href: "/einstellungen/import-aliase"');
    expect(settingsPage).not.toContain('name="pattern"');
    expect(settingsPage).not.toContain('name="displayName"');
    expect(importAliasesPage).toContain("Import-Aliasse");
    expect(importAliasesPage).toContain("Aliasse ändern nur den sichtbaren Namen");
    expect(importAliasesPage).toContain("Aktive Aliasse");
    expect(importAliasesPage).toContain('aria-label="Zurück zu Einstellungen"');
    expect(importAliasesPage).not.toContain("Anzeigenamen für importierte Buchungen");
    expect(importAliasesPage).not.toContain("Global gültig über alle Monate");
    expect(importAliasesPage).not.toContain("Getrennt von Import-Regelvorschlaegen");
    expect(importAliasesPage).not.toContain("Wenn der originale oder bereinigte Importtext");
    expect(importAliasesPage).toContain('name="pattern"');
    expect(importAliasesPage).toContain('name="displayName"');
    expect(importAliasesPage).toContain("month-hero-panel");
    expect(settingsActions).toContain("createImportDisplayAliasAction");
    expect(settingsActions).toContain("updateImportDisplayAliasAction");
    expect(settingsActions).toContain("deleteImportDisplayAliasAction");
    expect(settingsActions).toContain("/einstellungen/import-aliase");
  });

  it("uses display names in month and imported transaction lists while preserving original text", () => {
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");
    const transactionsPage = readProjectFile("app/transaktionen/page.tsx");

    expect(monthPage).toContain("transaction.displayName");
    expect(monthPage).toContain("Originaler Banktext");
    expect(monthPage).toContain("transaction.description");
    expect(transactionsPage).toContain("row.displayName");
    expect(transactionsPage).toContain("title={row.description}");
  });
});

describe("FIN-118 import display alias edit mode", () => {
  it("keeps existing aliases read-only by default and gates editing behind edit mode", () => {
    const importAliasesPage = readProjectFile("app/einstellungen/import-aliase/page.tsx");
    const settingsActions = readProjectFile("app/einstellungen/actions.ts");

    expect(importAliasesPage).toContain("const isEditing = toSingleParam(params.edit) === \"1\"");
    expect(importAliasesPage).toContain('href="/einstellungen/import-aliase?edit=1"');
    expect(importAliasesPage).toContain("aria-label=\"Import-Aliasse bearbeiten\"");
    expect(importAliasesPage).toContain("aria-label=\"Editiermodus für Import-Aliasse beenden\"");
    expect(importAliasesPage).toContain('aria-label="Import-Aliasse"');
    expect(importAliasesPage).toContain('aria-label="Import-Aliasse bearbeiten"');
    expect(importAliasesPage).toContain("Muster enthält");
    expect(importAliasesPage).toContain("Anzeigename");
    expect(importAliasesPage).toContain("returnToEdit");
    expect(importAliasesPage).toContain("Löschen bestätigen");
    expect(importAliasesPage).toContain('name="confirmDelete"');
    expect(importAliasesPage).toContain("isEditing ? (");
    expect(settingsActions).toContain("assertAliasDeleteConfirmed");
    expect(settingsActions).toContain("Alias-Löschung muss bestätigt werden.");
  });
});
