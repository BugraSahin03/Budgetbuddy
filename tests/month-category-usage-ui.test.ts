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
