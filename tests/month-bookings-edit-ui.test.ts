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
    expect(page).not.toContain("Read-only Ansicht für schnelles Prüfen");
    expect(page).toContain("Editiermodus für Monatsbuchungen aktivieren");
    expect(page).toContain('id="monatsbuchungen"');
    expect(page).toContain("#monatsbuchungen");
    expect(page).toContain('title={isBookingEditMode ? "Fertig" : "Bearbeiten"}');
    expect(page).toContain("canEditBookings ? (");
    expect(page).toContain("canDirectlyEditAssignment");
    expect(page).toContain("!canEditBookings");
    expect(page).toContain("DirectAssignmentSelect");
    expect(page).toContain("currentAssignmentLabel");
    expect(directSelect).toContain("setIsPending(true)");
    expect(directSelect).toContain("fetch(`/monate/${monthKey}/assignments`");
    expect(directSelect).toContain("Kategoriezuordnung direkt ändern");
    expect(directSelect).toContain("border-red-200 bg-red-50 text-red-700");
    expect(directSelect).toContain("border-emerald-200 bg-emerald-50 text-emerald-800");
  });

  it("surfaces closed month controls and blocks edit mode when the month is closed", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(page).toContain("MonthCloseControl");
    expect(page).toContain("Monat abschließen");
    expect(page).toContain("Wieder öffnen");
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
    expect(page).toContain("Import-Buchung löschen");
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
    expect(page).not.toContain('action={updateMonthlyTransactionAssignmentAction}\n                        className="inline-flex max-w-full"\n                      >\n                        <DirectAssignmentSelect');
    expect(directSelect).toContain('<optgroup label="Kategorien">');
    expect(directSelect).toContain('<optgroup label="Sonderkategorien">');
    expect(directSelect).toContain("Sonderkategorie · {budget.name}");
    expect(directSelect).toContain("<option value=\"\" disabled>");
    expect(directSelect).toContain("hasCurrentAssignmentOption");
    expect(directSelect).toContain("<option value={savedAssignment}>{currentAssignmentLabel}</option>");
  });

  it("saves direct assignments through a month API route without page navigation", () => {
    const route = readProjectFile("app/monate/[monthKey]/assignments/route.ts");
    const directSelect = readProjectFile(
      "app/monate/[monthKey]/direct-assignment-select.tsx",
    );

    expect(route).toContain("export async function PATCH");
    expect(route).toContain("updateExpenseAssignmentForMonth");
    expect(route).toContain("NextResponse.json");
    expect(directSelect).toContain("setSelectedAssignment(assignment)");
    expect(directSelect).toContain("setSavedAssignment(assignment)");
    expect(directSelect).not.toContain("requestSubmit");
  });

  it("updates the visible category overview after direct assignment changes", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const directSelect = readProjectFile(
      "app/monate/[monthKey]/direct-assignment-select.tsx",
    );
    const overview = readProjectFile(
      "app/monate/[monthKey]/month-category-overview.tsx",
    );

    expect(page).toContain("MonthCategoryOverview");
    expect(page).toContain("amountCents={transaction.amountCents}");
    expect(directSelect).toContain("updateLiveAssignmentOverview");
    expect(directSelect).toContain("updateLiveOverviewRow");
    expect(directSelect).toContain("Math.abs(amountCents)");
    expect(overview).toContain("data-live-category-id");
    expect(overview).toContain("data-live-special-budget-id");
    expect(overview).toContain("data-live-spent-cents");
    expect(overview).toContain("data-live-amount");
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

  it("adds a quiet multi-filter for month bookings without changing booking data", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const filter = readProjectFile(
      "app/monate/[monthKey]/month-booking-filter.tsx",
    );
    const directSelect = readProjectFile(
      "app/monate/[monthKey]/direct-assignment-select.tsx",
    );

    expect(page).toContain("MonthBookingFilter");
    expect(page).toContain("buildBookingFilterOptions(month.transactions)");
    expect(page).toContain("transactionFilterToken(");
    expect(page).toContain("data-month-booking-row");
    expect(page).toContain("data-booking-filter-tokens");
    expect(page).toContain("Ohne Zuordnung");
    expect(page).toContain("category:");
    expect(page).toContain("specialBudget:");
    expect(page).toContain("open");
    expect(filter).toContain("Filter zurücksetzen");
    expect(filter).toContain("aria-pressed={isSelected}");
    expect(filter).toContain("selectedTokens.some");
    expect(filter).toContain("row.hidden = !isVisible");
    expect(directSelect).toContain("updateBookingFilterToken");
    expect(directSelect).toContain("month-booking-filter-row-updated");
  });
});
