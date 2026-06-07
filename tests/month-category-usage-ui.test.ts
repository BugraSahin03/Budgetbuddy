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

    expect(page).toContain("getCategoryUsageState(row)");
    expect(page).toContain("categoryUsageSurfaceStyle(usageState)");
    expect(page).toContain("categoryUsageProgressStyle(usageState)");
    expect(page).toContain("categoryUsageChipClassName(usageState)");
    expect(page).not.toContain("categorySoftStyle(category?.colorHex)");
    expect(page).not.toContain("categoryProgressStyle(category?.colorHex)");
  });
});
