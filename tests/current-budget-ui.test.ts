import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("current budget UI", () => {
  it("uses the same actual-based total on dashboard and month hero", () => {
    const dashboardPage = readProjectFile("app/page.tsx");
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(dashboardPage).toContain("snapshot.totals.currentBudgetCents");
    expect(monthPage).toContain("month.dashboard.totals.currentBudgetCents");
    expect(dashboardPage).not.toContain("projectedAfterFixedCostsCents");
  });
});
