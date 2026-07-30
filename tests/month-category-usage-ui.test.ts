import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-064 month category usage UI", () => {
  it("uses dynamic usage colors instead of manual category colors in the month category breakdown", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const overview = readProjectFile(
      "app/monate/[monthKey]/month-category-overview.tsx",
    );

    expect(overview).toContain("getCategoryUsageState(row)");
    expect(page).toContain("categoryUsageSurfaceStyle(usageState)");
    expect(overview).toContain("categoryUsageProgressStyle(usageState)");
    expect(page).toContain("categoryUsageChipClassName(usageState)");
    expect(`${page}\n${overview}`).not.toContain(
      "categorySoftStyle(category?.colorHex)",
    );
    expect(`${page}\n${overview}`).not.toContain(
      "categoryProgressStyle(category?.colorHex)",
    );
  });
});

describe("FIN-121 shared monthly plan scale", () => {
  it("scales categories and special budgets against the same monthly maximum", () => {
    const overview = readProjectFile(
      "app/monate/[monthKey]/month-category-overview.tsx",
    );
    const globals = readProjectFile("app/globals.css");

    expect(overview).toContain("getHighestPlannedAmountCents");
    expect(overview).toContain("...categoryRows.map");
    expect(overview).toContain("...specialBudgetRows.map");
    expect(overview).toContain("getCategoryPlanScale");
    expect(overview).toContain("data-plan-scale-percent");
    expect(globals).toContain(".month-category-plan-scale");
    expect(globals).toContain("min-width: 2.75rem");
  });
});
