import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-074 month fixed-cost control list UI", () => {
  it("shows fixed-cost control matches in the month dialog as read-only transparency", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("month.dashboard.fixedCostControlMatches");
    expect(page).toContain("Kontrolltreffer");
    expect(page).toContain("Erkannte Fixkosten-Buchungen");
    expect(page).toContain("Keine Fixkosten-Kontrolltreffer in diesem Monat erkannt.");
    expect(page).toContain("fixedCostControlReasonLabel(match)");
    expect(page).toContain("match.bookingDate");
    expect(page).toContain("match.displayName");
    expect(page).toContain("match.description");
    expect(page).toContain("formatEuro(match.controlAmountCents)");
    expect(page).toContain("month.transactions.map((transaction)");
    expect(page).not.toContain("fixed_cost_transaction_links");
  });
});
