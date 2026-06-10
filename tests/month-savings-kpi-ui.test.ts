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
    expect(page).not.toContain("incomeCents - expenseCents");
  });

  it("keeps savings visually accented in month category marks", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("function categoryMarkVariant");
    expect(page).toContain("category?.isSavings ? \"accent\" : \"neutral\"");
    expect(page).toContain("variant={categoryMarkVariant(category)}");
  });
});
