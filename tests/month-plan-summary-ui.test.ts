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

    expect(page).toContain("Planpuffer");
    expect(page).toContain("Grob uebrig nach geplanten Toepfen.");
    expect(page).toContain("month.dashboard.planSummary.plannedBudgetPotCents");
    expect(page).toContain(
      "month.dashboard.planSummary.planRestAfterBudgetPotsCents",
    );
    expect(page).toContain("activeSpecialBudgetRows");
    expect(page).toContain("Sonderbudgets");
    expect(page).toContain("getCategoryUsageState({");
    expect(page).toContain("categoryUsageProgressStyle");
    expect(page).not.toContain(
      "{month.dashboard.categoryRows.length} Kategorien",
    );
  });
});
