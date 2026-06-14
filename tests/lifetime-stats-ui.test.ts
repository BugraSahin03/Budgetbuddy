import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-076 lifetime stats UI", () => {
  it("adds a quiet settings entry and a dedicated insights page", () => {
    const settingsPage = readProjectFile("app/einstellungen/page.tsx");
    const statsPage = readProjectFile("app/einstellungen/gesamtstatistik/page.tsx");

    expect(settingsPage).toContain("/einstellungen/gesamtstatistik");
    expect(settingsPage).toContain("Gesamtstatistik");
    expect(statsPage).toContain("BudgetBuddy in Zahlen");
    expect(statsPage).toContain("listLifetimeStats()");
    expect(statsPage).toContain("Einnahmen gesamt");
    expect(statsPage).toContain("Ausgaben gesamt");
    expect(statsPage).toContain("Gespart gesamt");
    expect(statsPage).toContain("<details");
    expect(statsPage).toContain("Zahlenbuch nach Jahren");
    expect(statsPage).not.toContain("Eine ruhige Gesamtuebersicht");
  });
});
