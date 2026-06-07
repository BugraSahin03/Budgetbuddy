import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const pageSource = readFileSync(join(rootDir, "app/budgets/page.tsx"), "utf8");
const actionSource = readFileSync(join(rootDir, "app/budgets/actions.ts"), "utf8");
const createTabsSource = readFileSync(join(rootDir, "app/budgets/budget-create-tabs.tsx"), "utf8");
const editorSource = readFileSync(join(rootDir, "app/budgets/budget-care-editor.tsx"), "utf8");
const dialogSource = readFileSync(join(rootDir, "app/budgets/budget-dialog.tsx"), "utf8");
const cssSource = readFileSync(join(rootDir, "app/globals.css"), "utf8");

describe("budgets page simplification", () => {
  it("uses one calm budget care area instead of three hard admin sections", () => {
    expect(pageSource).toContain("Budgettoepfe und Standardwerte");
    expect(editorSource).toContain("Kategorien und Sonderbudgets");
    expect(pageSource).toContain("budget-care-shell");
    expect(editorSource).toContain("budget-category-editor-form");
    expect(pageSource).not.toContain("Gemeinsame Pflege");
    expect(pageSource).not.toContain("Kategorien beschreiben dauerhafte Ausgabenarten");
    expect(pageSource).not.toContain('href="#kategorien"');
    expect(pageSource).not.toContain('href="#standardbudgets"');
    expect(pageSource).not.toContain('href="#sonderbudgets"');
  });

  it("uses one shared edit mode instead of per-category detail toggles", () => {
    expect(pageSource).toContain("BudgetCareEditor");
    expect(pageSource).toContain("updateBudgetCategoriesAction");
    expect(pageSource).toContain("budget-category-edit-panel");
    expect(dialogSource).toContain("showModal()");
    expect(cssSource).toContain(".budget-icon-action");
    expect(cssSource).toContain(".budget-care-editor.is-editing .budget-category-edit-panel");
    expect(pageSource).not.toContain("budget-edit-mode");
    expect(pageSource).not.toContain("Details bearbeiten");
  });

  it("creates categories through a dialog with optional icon and standard budget", () => {
    expect(pageSource).toContain("BudgetDialog");
    expect(dialogSource).toContain("showModal()");
    expect(pageSource).toContain("Kategorie oder Sonderbudget anlegen");
    expect(pageSource).toContain("BudgetCreateTabs");
    expect(createTabsSource).toContain("Kategorien");
    expect(createTabsSource).toContain("Sonderbudgets");
    expect(createTabsSource).toContain("Kategorie erstellen");
    expect(createTabsSource).toContain("Sonderbudget erstellen");
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
    expect(pageSource).toContain('name={`colorHex-${category.id}`}');
    expect(actionSource).toContain("colorHex: toOptionalString(formData.get(`colorHex-${categoryId}`))");
  });

  it("keeps special budgets visible as marked monthly pots", () => {
    expect(pageSource).toContain("Sonderbudgets");
    expect(pageSource).toContain("aktive Monatstoepfe");
    expect(pageSource).toContain("createSpecialBudgetAction");
    expect(pageSource).not.toContain('triggerLabel="Sonderbudget anlegen"');
    expect(pageSource).toContain("updateSpecialBudgetStateAction");
  });

  it("adds dedicated styling for the simplified surface", () => {
    expect(cssSource).toContain(".budget-hero-panel");
    expect(cssSource).toContain(".budget-dialog-plus");
    expect(cssSource).toContain(".budget-create-tabs");
    expect(cssSource).toContain(".budget-dialog[open]");
    expect(cssSource).toContain("justify-items: center");
    expect(cssSource).toContain(".budget-special-panel");
  });
});
