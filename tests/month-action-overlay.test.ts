import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type ImportFormModule = typeof import("@/app/import/import-form");

const ROOT = process.cwd();
let importFormModule: ImportFormModule;

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

beforeAll(async () => {
  importFormModule = await import("@/app/import/import-form");
});

describe("FIN-052 month action overlay", () => {
  it("offers one central month action with expense, income and import modes", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(monthPage).toContain("MonthActionOverlay");
    expect(overlay).toContain("Hinzufuegen");
    expect(overlay).toContain(">Ausgabe<");
    expect(overlay).toContain(">Einnahme<");
    expect(overlay).toContain(">Import CSV<");
    expect(overlay).toContain("month-action-dialog");
    expect(overlay).toContain("month-action-amount-stage");
    expect(overlay).toContain("month-action-cash-toggle");
    expect(overlay).toContain("month-action-topbar");
    expect(overlay).toContain("month-action-page");
    expect(overlay).toContain("month-action-budget-pill");
    expect(overlay).toContain("month-action-save-dock");
    expect(overlay).toContain("Buchung hinzufuegen");
    expect(overlay).toContain("toLocaleDateString");
    expect(overlay).not.toContain("month-action-stepper");
    expect(overlay).not.toContain("<p>BudgetBuddy</p>");
  });

  it("contains dialog scrolling inside the overlay surface", () => {
    const globals = readProjectFile("app/globals.css");

    expect(globals).toContain("overscroll-behavior: contain");
    expect(globals).not.toContain(".month-action-stepper");
  });

  it("keeps expense assignment as a single category-or-special-budget tile choice", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const actions = readProjectFile("app/monate/actions.ts");

    expect(overlay).toContain('name="assignment"');
    expect(overlay).toContain("category:${category.id}");
    expect(overlay).toContain("specialBudget:${budget.id}");
    expect(overlay).toContain("month-action-choice-icon");
    expect(actions).toContain("categoryMatch");
    expect(actions).toContain("specialBudgetMatch");
  });

  it("offers a cash toggle and keeps it wired into the month action", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const actions = readProjectFile("app/monate/actions.ts");

    expect(overlay).toContain("Bargeld");
    expect(overlay).toContain('name="useCashAccount"');
    expect(overlay).toContain('name="accountId"');
    expect(overlay).toContain("HiddenAccountInput");
    expect(overlay).not.toContain("month-action-account-card");
    expect(actions).toContain("getActiveCashAccountId()");
    expect(actions).toContain('formData.get("useCashAccount")');
  });

  it("embeds existing import flow with the current month preselected", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const importForm = readProjectFile("app/import/import-form.tsx");
    const importActions = readProjectFile("app/import/actions.ts");

    expect(overlay).toContain("<ImportForm");
    expect(overlay).toContain("defaultEffectiveMonthKey={monthKey}");
    expect(overlay).toContain("returnMonthKey={monthKey}");
    expect(importForm).toContain("defaultEffectiveMonthKey");
    expect(importActions).toContain("revalidatePath(`/monate/${returnMonthKey}`)");
  });

  it("keeps the opened month as import default inside the embedded overlay after preview", () => {
    expect(
      importFormModule.resolveEffectiveMonthDefault({
        detectedMonthKey: "2033-04",
        defaultEffectiveMonthKey: "2033-03",
        fallbackMonthKey: "2033-06",
        surface: "embedded",
      }),
    ).toBe("2033-03");

    expect(
      importFormModule.resolveEffectiveMonthDefault({
        detectedMonthKey: "2033-04",
        defaultEffectiveMonthKey: "2033-03",
        fallbackMonthKey: "2033-06",
        surface: "default",
      }),
    ).toBe("2033-04");
  });

  it("does not render editable target month fields in the month overlay", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const importForm = readProjectFile("app/import/import-form.tsx");

    expect(overlay).not.toContain('type="month"');
    expect(overlay).not.toContain("Zielmonat");
    expect(overlay).not.toContain("Der Zielmonat ist auf");
    expect(overlay).toContain('type="hidden" name="effectiveMonthKey" value={monthKey}');
    expect(importForm).toContain('surface === "embedded"');
    expect(importForm).toContain('name="effectiveMonthKey" type="hidden"');
    expect(importForm).not.toContain("Der geoeffnete Monat wird automatisch fuer diesen Import verwendet.");
  });

  it("shows the monthly budget stand in the header and reduces the add action to a plus button", () => {
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const globals = readProjectFile("app/globals.css");

    expect(monthPage).toContain("Aktueller Budgetstand");
    expect(monthPage).toContain("month.dashboard.totals.availableCents");
    expect(monthPage).toContain("budgetStandTone");
    expect(monthPage).not.toContain(
      "Einnahmen abzueglich variabler Ausgaben und geplanter Fixkosten.",
    );
    expect(monthPage).not.toContain(
      "Einnahmen, Ausgaben und Budgetarbeit in einer ruhigen Finanzsicht.",
    );
    expect(monthPage).not.toContain("md:ml-16");
    expect(monthPage).not.toContain(">BudgetBuddy<");
    expect(overlay).toContain('aria-label="Buchung hinzufuegen"');
    expect(overlay).toContain('<span aria-hidden="true">+</span>');
    expect(overlay).toContain("month-action-primary-label");
    expect(globals).toContain(".month-budget-stand-card");
    expect(globals).toContain('.month-action-primary > span[aria-hidden="true"]');
    expect(globals).toContain(".month-action-primary-label");
  });
});
