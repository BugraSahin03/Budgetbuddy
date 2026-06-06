import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-060 month bookings edit UI", () => {
  it("keeps all bookings read-only until the explicit edit mode is active", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("bookingEdit");
    expect(page).not.toContain("Read-only Ansicht fuer schnelles Pruefen");
    expect(page).toContain("Editiermodus fuer Monatsbuchungen aktivieren");
    expect(page).toContain('id="monatsbuchungen"');
    expect(page).toContain("#monatsbuchungen");
    expect(page).toContain('title={isBookingEditMode ? "Fertig" : "Bearbeiten"}');
    expect(page).toContain("isBookingEditMode ? (");
  });

  it("uses one Budgetzuordnung control and explicit delete confirmation in edit mode", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain('name="assignment"');
    expect(page).toContain('optgroup label="Kategorien"');
    expect(page).toContain('optgroup label="Sonderbudgets"');
    expect(page).toContain("Sonderbudget · {budget.name}");
    expect(page).toContain("deleteMonthlyManualTransactionAction");
    expect(page).toContain("deleteMonthlyImportedTransactionAction");
    expect(page).toContain('name="confirmDelete"');
    expect(page).toContain("Import-Buchung loeschen");
  });

  it("renders quiet read-only chips and semantic symbol tiles instead of permanent type/source fields", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("function TransactionVisualMark");
    expect(page).toContain("CategoryVisualMark");
    expect(page).toContain("function assignmentChipLabel");
    expect(page).toContain("Zuordnen");
    expect(page).toContain("lg:grid-cols-[auto_minmax(0,1.25fr)_minmax(8.5rem,auto)_minmax(9.5rem,auto)_auto]");
    expect(page).toContain("truncate text-2xl font-black");
    expect(page).toContain("border-amber-200 bg-amber-100");
    expect(page).toContain("border-red-200 bg-red-100");
  });
});
