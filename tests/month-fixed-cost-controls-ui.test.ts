import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("month fixed-cost control list UI", () => {
  it("shows fixed-cost control matches and manual override actions in the month dialog", () => {
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
    expect(page).toContain("match.controlSource");
    expect(page).toContain("manuell");
    expect(page).toContain("updateMonthlyFixedCostControlOverrideAction");
    expect(page).toContain("isFixedCostControlDialogOpen");
    expect(page).toContain("initialOpen={isFixedCostControlDialogOpen}");
    expect(page).toContain("Markierung entfernen");
    expect(page).toContain("Als Fixkosten markieren");
    expect(page).toContain("monthBookingHistory.map((entry)");
    expect(page).not.toContain("fixed_cost_transaction_links");
  });

  it("separates plan, actual, variance and the planned projection", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const variance = readProjectFile("src/months/fixed-cost-variance.ts");

    expect(page).toContain("Fixkosten (Plan)");
    expect(page).toContain("Fixkosten (Ist)");
    expect(page).toContain("getFixedCostVariance");
    expect(variance).toContain("Noch nicht als Fixkosten gebucht");
    expect(variance).toContain("Plan und Ist stimmen überein");
    expect(variance).toContain("Fixkosten-Ist liegt über Plan");
    expect(page).toContain("Voraussichtlich nach Fixkostenplan");
    expect(page).toContain(
      "Die Projektion setzt eine vollständige Fixkostenkontrolle voraus.",
    );
    expect(page).toContain(
      "month.dashboard.totals.projectedAfterFixedCostsCents",
    );
  });
});
