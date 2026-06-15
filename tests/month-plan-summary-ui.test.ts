import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-066 month plan summary UI", () => {
  it("shows budget pot plan values instead of a prominent category count in the month overview", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const overview = readProjectFile(
      "app/monate/[monthKey]/month-category-overview.tsx",
    );
    const combinedMonthUi = `${page}\n${overview}`;

    expect(overview).toContain("Rest nach Planung");
    expect(page).toContain("month.dashboard.planSummary.plannedBudgetPotCents");
    expect(combinedMonthUi).toContain("planRestAfterBudgetPotsCents");
    expect(page).not.toContain('label="Rest nach Planung"');
    expect(page).not.toContain("Einnahmen minus Kategorien.");
    expect(page).toContain("activeSpecialBudgetRows");
    expect(overview).toContain("Sonderkategorien");
    expect(overview).toContain("getCategoryUsageState({");
    expect(overview).toContain("categoryUsageProgressStyle");
    expect(combinedMonthUi).not.toContain(
      "{month.dashboard.categoryRows.length} Kategorien",
    );
  });
});
