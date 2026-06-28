import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-107 mobile month overview", () => {
  it("keeps month header, KPI cards and booking lists responsive without touching calculations", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const overview = readProjectFile(
      "app/monate/[monthKey]/month-category-overview.tsx",
    );
    const filter = readProjectFile(
      "app/monate/[monthKey]/month-booking-filter.tsx",
    );
    const globals = readProjectFile("app/globals.css");

    expect(page).toContain("month-reference-metric-card");
    expect(page).toContain("month-reference-actions");
    expect(page).toContain("month-expense-title");
    expect(page).toContain("month-expense-subtitle");
    expect(page).toContain("month-booking-title");
    expect(page).toContain("month-booking-date");
    expect(page).toContain("month-booking-assignment");
    expect(page).toContain("month-booking-amount");
    expect(overview).toContain("month-category-title");
    expect(filter).toContain("w-full min-w-0");
    expect(globals).toContain("@media (max-width: 639px)");
    expect(globals).toContain(".month-reference-metric-card");
    expect(globals).toContain(".month-expense-row");
    expect(globals).toContain("grid-template-columns: 2.5rem minmax(0, 1fr);");
    expect(globals).toContain("overflow-wrap: anywhere;");
    expect(globals).toContain(".month-booking-amount");
  });
});
