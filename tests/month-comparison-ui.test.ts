import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-075 month comparison UI", () => {
  it("keeps the month comparison focused on income, expenses and savings", () => {
    const page = readProjectFile("app/monatsvergleich/page.tsx");

    expect(page).toContain("listMonthComparison()");
    expect(page).toContain("month.incomeCents");
    expect(page).toContain("month.expenseCents");
    expect(page).toContain("month.savingsCents");
    expect(page).toContain("Einnahmen");
    expect(page).toContain("Ausgaben");
    expect(page).toContain("Gespart");
    expect(page).not.toContain("savedLabel");
    expect(page).not.toContain("savedTone");
    expect(page).not.toContain("Ueberschuss");
    expect(page).not.toContain("Defizit");
    expect(page).not.toContain("MonthChip");
    expect(page).not.toContain("{month.monthKey}</");
    expect(page).not.toContain("Monat oeffnen");
  });
});
