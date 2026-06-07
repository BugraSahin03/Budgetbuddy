import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const pageSource = readFileSync(join(rootDir, "app/budgets/page.tsx"), "utf8");
const actionSource = readFileSync(join(rootDir, "app/budgets/actions.ts"), "utf8");
const dialogSource = readFileSync(join(rootDir, "app/budgets/budget-dialog.tsx"), "utf8");
const cssSource = readFileSync(join(rootDir, "app/globals.css"), "utf8");

describe("budgets page simplification", () => {
  it("uses one calm budget care area instead of three hard admin sections", () => {
    expect(pageSource).toContain("Budgettoepfe und Standardwerte");
    expect(pageSource).toContain("budget-care-shell");
    expect(pageSource).toContain("budget-pot-list");
    expect(pageSource).not.toContain('href="#kategorien"');
    expect(pageSource).not.toContain('href="#standardbudgets"');
    expect(pageSource).not.toContain('href="#sonderbudgets"');
  });

  it("creates categories through a dialog with optional icon and standard budget", () => {
    expect(pageSource).toContain("BudgetDialog");
    expect(dialogSource).toContain("showModal()");
    expect(pageSource).toContain("createBudgetCategoryAction");
    expect(pageSource).toContain('name="iconName"');
    expect(pageSource).toContain('name="budgetAmount"');
    expect(actionSource).toContain("createBudgetCategoryAction");
    expect(actionSource).toContain("setCategoryDefaultBudget(createdCategory.id, budgetAmount)");
  });

  it("removes manual category color care from the visible UI while preserving stored values", () => {
    expect(pageSource).not.toContain("new-color");
    expect(pageSource).not.toContain("Farbvorschau");
    expect(pageSource).not.toContain("categoryColorPreview");
    expect(pageSource).toContain('type="hidden" name="colorHex" value=""');
    expect(pageSource).toContain('type="hidden" name="colorHex" value={category.colorHex ?? ""}');
  });

  it("keeps special budgets visible as marked monthly pots", () => {
    expect(pageSource).toContain("Sonderbudgets");
    expect(pageSource).toContain("aktive Monatstoepfe");
    expect(pageSource).toContain("createSpecialBudgetAction");
    expect(pageSource).toContain("updateSpecialBudgetStateAction");
  });

  it("adds dedicated styling for the simplified surface", () => {
    expect(cssSource).toContain(".budget-hero-panel");
    expect(cssSource).toContain(".budget-dialog-plus");
    expect(cssSource).toContain(".budget-special-panel");
  });
});
