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
    expect(importAliasesPage).toContain("Anzeigenamen fuer importierte Buchungen");
    expect(importAliasesPage).toContain("Aliasse aendern nur den sichtbaren Namen");
    expect(importAliasesPage).toContain("Getrennt von Import-Regelvorschlaegen und Fixkosten-Kontrollen");
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
