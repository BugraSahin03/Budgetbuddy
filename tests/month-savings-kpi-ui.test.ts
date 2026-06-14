import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-068 month savings KPI UI", () => {
  it("shows a dedicated savings KPI from the month read model", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain('label="Gespart"');
    expect(page).toContain("month.dashboard.totals.savingsCents");
    expect(page).toContain("Echte Buchungen der Kategorie Sparen.");
    expect(page).toContain('tone="savings"');
    expect(page).toContain('marker: { backgroundColor: "#d9f7b5", color: "#365f08" }');
    expect(page).toContain('value: { color: "#4f7d12" }');
    expect(page).not.toContain("incomeCents - expenseCents");
  });

  it("keeps category marks neutral so savings is not singled out in category lists", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain('variant="neutral"');
    expect(page).not.toContain("categoryMarkVariant");
  });

  it("hides missing plan copy for savings in the category overview", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("const isSavingsCategory = category?.isSavings === true");
    expect(page).toContain("{!isSavingsCategory ? (");
    expect(page).toContain("Budget fehlt");
    expect(page).toContain("Kein Planwert");
  });

  it("does not offer a monthly budget amount field for savings in budget care", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("Sparen entsteht durch echte Buchungen");
    expect(page).toContain("{!isSavingsCategory ? (");
    expect(page).not.toContain("Leerer Wert entfernt nur den Monats-Override");
  });
});
