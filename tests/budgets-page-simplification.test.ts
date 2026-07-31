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
    expect(pageSource).toContain("<h1>Budgetpflege</h1>");
    expect(editorSource).toContain("<h2>Kategorien</h2>");
    expect(editorSource).toContain('aria-label="Kategorien und Sonderkategorien"');
    expect(pageSource).toContain("budget-care-shell");
    expect(editorSource).toContain("budget-category-editor-form");
    expect(pageSource).not.toContain("Kategorien und Sonderkategorien und Standardwerte");
    expect(pageSource).not.toContain("aktive Kategorien und Sonderkategorien");
    expect(pageSource).not.toContain("mit Standardwert");
    expect(pageSource).not.toContain("Kategorie = wofuer du Geld ausgibst");
    expect(pageSource).not.toContain("Gemeinsame Pflege");
    expect(pageSource).not.toContain("Kategorien beschreiben dauerhafte Ausgabenarten");
    expect(pageSource).not.toContain('href="#kategorien"');
    expect(pageSource).not.toContain('href="#standardbudgets"');
    expect(pageSource).not.toContain('href="#sonderbudgets"');
  });

  it("uses one shared edit mode instead of per-category detail toggles", () => {
    expect(pageSource).toContain("BudgetCareEditor");
    expect(pageSource).toContain("categories={editorCategories}");
    expect(pageSource).toContain("updateBudgetCategoriesAction");
    expect(editorSource).toContain("if (isEditing)");
    expect(editorSource).toContain('action={action}');
    expect(editorSource).toContain("budget-category-edit-panel");
    expect(editorSource).toContain("budget-pot-readonly-value");
    expect(editorSource).toContain('name={`budgetAmount-${category.id}`}');
    expect(editorSource).toContain('name={`name-${category.id}`}');
    expect(editorSource).toContain('name={`iconName-${category.id}`}');
    expect(editorSource).toContain("maxLength={2}");
    expect(editorSource).toContain("initialIsEditing");
    expect(editorSource).toContain("changedCategoryIds");
    expect(editorSource).toContain("markCategoryChanged");
    expect(editorSource).toContain("deactivateCategory:");
    expect(editorSource).toContain("budget-secondary-action");
    expect(editorSource).not.toContain("form={formId}");
    expect(dialogSource).toContain("showModal()");
    expect(cssSource).toContain(".budget-icon-action");
    expect(cssSource).toContain(".budget-care-editor.is-editing .budget-category-edit-panel");
    expect(pageSource).not.toContain("budget-edit-mode");
    expect(pageSource).not.toContain("Details bearbeiten");
  });

  it("creates categories through a dialog with optional icon and standard budget", () => {
    expect(pageSource).toContain("BudgetDialog");
    expect(dialogSource).toContain("showModal()");
    expect(pageSource).toContain("Kategorie oder Sonderkategorie anlegen");
    expect(pageSource).toContain("BudgetCreateTabs");
    expect(createTabsSource).toContain("Kategorien");
    expect(createTabsSource).toContain("Sonderkategorien");
    expect(createTabsSource).toContain("Kategorie erstellen");
    expect(createTabsSource).toContain("Sonderkategorie erstellen");
    expect(pageSource).not.toContain("Lege entweder einen dauerhaften Kategorie");
    expect(createTabsSource).not.toContain("Dauerhafter Kategorie");
    expect(createTabsSource).not.toContain("Monatstopf fuer einmalige");
    expect(pageSource).not.toContain("In Standardlisten anzeigen");
    expect(pageSource).toContain("Betrag");
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
    expect(editorSource).toContain('name={`colorHex-${category.id}`}');
    expect(actionSource).toContain("colorHex: toOptionalString(formData.get(`colorHex-${categoryId}`))");
  });

  it("keeps category cards readable without obvious status metadata", () => {
    expect(editorSource).not.toContain("Buchungen ·");
    expect(editorSource).not.toContain("Monatswerte");
    expect(editorSource).not.toContain("<span>Standardbudget</span>");
    expect(editorSource).not.toContain("Kein Standardwert");
  });

  it("keeps savings protected while allowing only icon editing", () => {
    expect(editorSource).toContain("category.isSavings");
    expect(editorSource).toContain('name={`name-${category.id}`} value={category.name}');
    expect(editorSource).toContain('name={`budgetAmount-${category.id}`} value=""');
    expect(editorSource).toContain('name={`iconName-${category.id}`}');
    expect(editorSource).toContain("Sparen ist geschuetzt; nur das Icon ist editierbar.");
  });

  it("keeps special budgets visible as marked monthly pots", () => {
    expect(editorSource).toContain("Sonderkategorien");
    expect(pageSource).toContain("createBudgetSpecialBudgetAction");
    expect(pageSource).toContain("listCategories().filter((category) => category.isActive)");
    expect(pageSource).toContain("listActiveSpecialBudgetProjects()");
    expect(pageSource).toContain("specialBudgets={specialBudgets}");
    expect(editorSource).toContain("function SpecialBudgetList");
    expect(editorSource).toContain("budget-special-pot-card");
    expect(editorSource).toContain("{isEditing ? (");
    expect(pageSource).not.toContain('triggerLabel="Sonderkategorie anlegen"');
    expect(pageSource).not.toContain("aktive Monatstoepfe");
    expect(cssSource).not.toContain(".budget-special-panel");
    expect(actionSource).toContain("updateBudgetSpecialBudgetStateAction");
    expect(actionSource).toContain("setSpecialBudgetProjectActive(specialBudgetProjectId, false)");
    expect(editorSource).toContain("changedSpecialBudgetProjectIds");
    expect(editorSource).toContain("markSpecialBudgetProjectChanged");
    expect(editorSource).toContain("archiveSpecialBudgetProject:");
  });

  it("adds dedicated styling for the simplified surface", () => {
    expect(cssSource).toContain(".budget-hero-panel");
    expect(cssSource).toContain(".budget-dialog-plus");
    expect(cssSource).toContain(".budget-create-tabs");
    expect(cssSource).toContain(".budget-dialog[open]");
    expect(cssSource).toContain("justify-items: center");
    expect(cssSource).toContain(".budget-special-pot-card");
    expect(cssSource).toContain(".budget-section-heading");
    expect(cssSource).toContain(".budget-secondary-action");
  });
});
