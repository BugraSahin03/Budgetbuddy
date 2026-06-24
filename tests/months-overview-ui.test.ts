import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-099 months overview UI", () => {
  it("groups month cards into collapsible year sections without changing timeline data", () => {
    const page = readProjectFile("app/monate/page.tsx");

    expect(page).toContain("listMonthTimeline()");
    expect(page).toContain("groupMonthsByYear(months)");
    expect(page).toContain("month.monthKey.slice(0, 4)");
    expect(page).toContain("<details");
    expect(page).toContain("group.year");
    expect(page).toContain("newestMonthKey");
    expect(page).toContain("Neuester Monat");
  });
});
