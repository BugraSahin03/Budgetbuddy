import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-059 import display alias UI", () => {
  it("keeps import display aliases under settings and separate from import rules", () => {
    const settingsPage = readProjectFile("app/einstellungen/page.tsx");
    const settingsActions = readProjectFile("app/einstellungen/actions.ts");

    expect(settingsPage).toContain("Import-Aliasse");
    expect(settingsPage).toContain("Anzeigenamen fuer importierte Buchungen");
    expect(settingsPage).toContain("Aliasse aendern nur den sichtbaren Namen");
    expect(settingsPage).toContain("getrennt von Import-Regelvorschlaegen und Fixkosten-Kontrollen");
    expect(settingsPage).toContain('name="pattern"');
    expect(settingsPage).toContain('name="displayName"');
    expect(settingsActions).toContain("createImportDisplayAliasAction");
    expect(settingsActions).toContain("updateImportDisplayAliasAction");
    expect(settingsActions).toContain("deleteImportDisplayAliasAction");
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
