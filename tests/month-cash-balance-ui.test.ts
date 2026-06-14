import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("FIN-078 month cash balance UI", () => {
  it("shows cash balance as a subtle header context instead of a large KPI", () => {
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");
    const globals = readProjectFile("app/globals.css");

    expect(monthPage).toContain("month-cash-inline");
    expect(monthPage).toContain("Bargeldbestand");
    expect(monthPage).toContain("month.dashboard.totals.cashBalanceCents");
    expect(monthPage).not.toContain('label="Bargeldbestand"');
    expect(monthPage).not.toContain("Separater Bestand, nicht automatisch Monatsrest.");
    expect(globals).toContain(".month-cash-inline");
  });
});
