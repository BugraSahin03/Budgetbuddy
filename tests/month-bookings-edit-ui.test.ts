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
    expect(page).toContain("Read-only Ansicht fuer schnelles Pruefen");
    expect(page).toContain("Editiermodus fuer Monatsbuchungen aktivieren");
    expect(page).toContain("Bearbeiten");
    expect(page).toContain("Fertig");
    expect(page).toContain("isBookingEditMode ? (");
  });

  it("uses one Budgetzuordnung control and explicit delete confirmation in edit mode", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain('name="assignment"');
    expect(page).toContain('optgroup label="Kategorien"');
    expect(page).toContain('optgroup label="Sonderbudgets"');
    expect(page).toContain("Sonderbudget · {budget.name}");
    expect(page).toContain("deleteMonthlyManualTransactionAction");
    expect(page).toContain('name="confirmDelete"');
  });

  it("renders quiet read-only chips and semantic symbol tiles instead of permanent type/source fields", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("function transactionTile");
    expect(page).toContain("function assignmentChipLabel");
    expect(page).toContain("Zuordnen");
    expect(page).toContain("Kategorie zugeordnet");
    expect(page).toContain("Sonderbudget zugeordnet");
    expect(page).toContain("Zuordnung erforderlich");
  });
});
