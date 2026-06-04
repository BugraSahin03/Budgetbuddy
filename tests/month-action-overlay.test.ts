import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-052 month action overlay", () => {
  it("offers one central month action with expense, income and import modes", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const monthPage = readProjectFile("app/monate/[monthKey]/page.tsx");

    expect(monthPage).toContain("MonthActionOverlay");
    expect(overlay).toContain("Hinzufuegen");
    expect(overlay).toContain(">Ausgabe<");
    expect(overlay).toContain(">Einnahme<");
    expect(overlay).toContain(">Import<");
    expect(overlay).toContain("month-action-dialog");
  });

  it("keeps expense assignment as a single category-or-special-budget tile choice", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const actions = readProjectFile("app/monate/actions.ts");

    expect(overlay).toContain('name="assignment"');
    expect(overlay).toContain("category:${category.id}");
    expect(overlay).toContain("specialBudget:${budget.id}");
    expect(actions).toContain("categoryMatch");
    expect(actions).toContain("specialBudgetMatch");
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
});
