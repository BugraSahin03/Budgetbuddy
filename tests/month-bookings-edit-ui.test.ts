import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-060/FIN-084 month bookings edit UI", () => {
  it("keeps full booking edits behind edit mode while allowing direct assignment", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const directSelect = readProjectFile(
      "app/monate/[monthKey]/direct-assignment-select.tsx",
    );

    expect(page).toContain("bookingEdit");
    expect(page).not.toContain("Read-only Ansicht fuer schnelles Pruefen");
    expect(page).toContain("Editiermodus fuer Monatsbuchungen aktivieren");
    expect(page).toContain('id="monatsbuchungen"');
    expect(page).toContain("#monatsbuchungen");
    expect(page).toContain('title={isBookingEditMode ? "Fertig" : "Bearbeiten"}');
    expect(page).toContain("canEditBookings ? (");
    expect(page).toContain("canDirectlyEditAssignment");
    expect(page).toContain("!canEditBookings");
    expect(page).toContain("DirectAssignmentSelect");
    expect(page).toContain("currentAssignmentLabel");
    expect(directSelect).toContain("requestSubmit");
    expect(directSelect).toContain("Kategoriezuordnung direkt aendern");
    expect(directSelect).toContain("border-red-200 bg-red-50 text-red-700");
    expect(directSelect).toContain("border-emerald-200 bg-emerald-50 text-emerald-800");
  });

  it("surfaces closed month controls and blocks edit mode when the month is closed", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("MonthCloseControl");
    expect(page).toContain("Monat abschliessen");
    expect(page).toContain("Wieder oeffnen");
    expect(page).toContain("Abgeschlossen");
    expect(page).toContain("Budgetpflege gesperrt");
    expect(page).toContain("const canEditBookings = isBookingEditMode && canEditMonth");
    expect(page).toContain("{canEditMonth ? (");
  });

  it("uses one Kategoriezuordnung control and explicit delete confirmation in edit mode", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain('name="assignment"');
    expect(page).toContain('optgroup label="Kategorien"');
    expect(page).toContain('optgroup label="Sonderkategorien"');
    expect(page).toContain("Sonderkategorie · {budget.name}");
    expect(page).toContain("deleteMonthlyManualTransactionAction");
    expect(page).toContain("deleteMonthlyImportedTransactionAction");
    expect(page).toContain('name="confirmDelete"');
    expect(page).toContain("Import-Buchung loeschen");
  });

  it("limits direct assignment to editable expense rows and keeps options grouped", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const directSelect = readProjectFile(
      "app/monate/[monthKey]/direct-assignment-select.tsx",
    );

    expect(page).toContain(
      'transaction.transactionType === "expense"',
    );
    expect(page).toContain("canEditMonth && canEditAssignment && !canEditBookings");
    expect(page).toContain("action={updateMonthlyTransactionAssignmentAction}");
    expect(page).not.toContain('name="bookingEdit" value="1" />\\n                        <DirectAssignmentSelect');
    expect(directSelect).toContain('<optgroup label="Kategorien">');
    expect(directSelect).toContain('<optgroup label="Sonderkategorien">');
    expect(directSelect).toContain("Sonderkategorie · {budget.name}");
    expect(directSelect).toContain("<option value=\"\" disabled>");
    expect(directSelect).toContain("hasCurrentAssignmentOption");
    expect(directSelect).toContain("<option value={currentAssignment}>{currentAssignmentLabel}</option>");
  });

  it("keeps successful assignment redirects outside the catch block", () => {
    const actions = readProjectFile("app/monate/actions.ts");
    const updateAction = actions.slice(
      actions.indexOf("export async function updateMonthlyTransactionAssignmentAction"),
      actions.indexOf("export async function updateMonthlyManualTransactionAction"),
    );

    expect(updateAction).toContain("let redirectTarget: string;");
    expect(updateAction).toContain("redirectTarget = monthBookingHref");
    expect(updateAction).toContain("redirect(redirectTarget);");
    expect(updateAction).not.toContain("redirect(\n      monthBookingHref");
  });

  it("renders quiet read-only chips and semantic symbol tiles instead of permanent type/source fields", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("function TransactionVisualMark");
    expect(page).toContain("CategoryVisualMark");
    expect(page).toContain("function assignmentChipLabel");
    expect(page).toContain("Zuordnen");
    expect(page).toContain("space-y-2.5");
    expect(page).toContain("month-booking-row-grid");
    expect(page).toContain("truncate text-base font-black");
    expect(page).toContain("text-lg font-black tracking-[-0.045em]");
    expect(page).toContain("border-amber-200 bg-amber-100");
    expect(page).toContain("border-red-200 bg-red-100");
  });
});
