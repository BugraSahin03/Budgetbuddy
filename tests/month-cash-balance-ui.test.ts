import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("FIN-078 month cash balance UI", () => {
  it("shows cash balance as a separate KPI in the month view", () => {
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(monthPage).toContain('label="Bargeldbestand"');
    expect(monthPage).toContain("month.dashboard.totals.cashBalanceCents");
    expect(monthPage).toContain("Separater Bestand, nicht automatisch Monatsrest.");
  });
});
