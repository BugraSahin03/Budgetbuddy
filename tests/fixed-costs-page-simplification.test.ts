import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const pageSource = readFileSync(join(rootDir, "app/fixkosten/page.tsx"), "utf8");
const actionsSource = readFileSync(join(rootDir, "app/fixkosten/actions.ts"), "utf8");
const settingsActionsSource = readFileSync(join(rootDir, "app/einstellungen/actions.ts"), "utf8");
const settingsPageSource = readFileSync(join(rootDir, "app/einstellungen/page.tsx"), "utf8");
const archivePageSource = readFileSync(join(rootDir, "app/einstellungen/fixkosten-archiv/page.tsx"), "utf8");
const editorSource = readFileSync(join(rootDir, "app/components/fixed-cost-care-editor.tsx"), "utf8");
const dialogSource = readFileSync(join(rootDir, "app/components/fixed-cost-dialog.tsx"), "utf8");
const cssSource = readFileSync(join(rootDir, "app/globals.css"), "utf8");

describe("fixed costs page simplification", () => {
  it("removes control matches from the fixed costs care page", () => {
    expect(pageSource).not.toContain("listFixedCostControlMatches");
    expect(pageSource).not.toContain("controlMatches");
    expect(pageSource).not.toContain("Kontrolltreffer");
    expect(pageSource).not.toContain("Kontrollsicht");
    expect(pageSource).not.toContain("Erkannte N26-Sammeltransfers");
    expect(pageSource).not.toContain("direkte Fixkostenmatches");
    expect(pageSource).not.toContain("Importlauf");
  });

  it("keeps fixed cost creation and editing reachable", () => {
    expect(pageSource).toContain("createFixedCostAction");
    expect(pageSource).toContain("updateFixedCostAction");
    expect(pageSource).toContain("FixedCostDialog");
    expect(pageSource).toContain('triggerLabel="+"');
    expect(pageSource).toContain('triggerAriaLabel="Fixkosten anlegen"');
    expect(pageSource).toContain("budget-dialog-form");
    expect(pageSource).toContain('name="plannedAmount"');
    expect(pageSource).toContain('name="bookingDayOfMonth"');
    expect(dialogSource).toContain("showModal()");
    expect(editorSource).toContain("Bestehende Fixkosten");
  });

  it("keeps existing fixed costs read-only until edit mode is enabled", () => {
    expect(pageSource).toContain("FixedCostCareEditor");
    expect(editorSource).toContain("initialIsEditing");
    expect(editorSource).toContain("budget-icon-action");
    expect(editorSource).toContain('key="edit-fixed-costs"');
    expect(editorSource).toContain('key="save-fixed-costs"');
    expect(editorSource).toContain('href="/fixkosten?edit=1"');
    expect(editorSource).toContain('type="submit"');
    expect(editorSource).toContain("fixed-cost-read-card");
    expect(editorSource).toContain("fixed-cost-state-dot");
    expect(editorSource).toContain("fixed-cost-edit-form");
    expect(editorSource).toContain("draggable={isEditing}");
    expect(editorSource).toContain("sortOrderIds");
    expect(editorSource).toContain("fixed-cost-sort-controls");
    expect(editorSource).toContain('name="stateChangeFixedCostId"');
    expect(editorSource).toContain("fixedCostIds");
    expect(editorSource).toContain("name={`plannedAmount-${row.id}`}");
    expect(actionsSource).toContain("parseIndexedFixedCostInput");
    expect(actionsSource).toContain("updateFixedCostSortOrder");
    expect(actionsSource).toContain("stateChangeFixedCostId");
    expect(actionsSource).toContain("edit=1");
    expect(actionsSource).toContain("redirect(redirectTarget)");
    expect(actionsSource).not.toContain('redirect("/fixkosten?notice="');
  });

  it("adds compact read-only search without changing edit-mode sorting", () => {
    expect(editorSource).toContain("fixed-cost-filter-panel");
    expect(editorSource).toContain('aria-label="Fixkosten filtern"');
    expect(editorSource).toContain('type="search"');
    expect(editorSource).toContain("Name, Info oder Notiz");
    expect(editorSource).toContain("fixed-cost-search-control");
    expect(editorSource).toContain("matchesSearch(row, searchTerm)");
    expect(editorSource).toContain("visibleFixedCosts");
    expect(editorSource).toContain("isEditing ? orderedFixedCosts : filteredFixedCosts");
    expect(editorSource).toContain("Keine Fixkosten passen zu Suche oder Filter.");
    expect(cssSource).toContain(".fixed-cost-filter-panel");
    expect(cssSource).toContain(".fixed-cost-search-control");
    expect(cssSource).toContain(".fixed-cost-filter-summary");
    expect(cssSource).toContain(".fixed-cost-filter-empty");
  });

  it("keeps archived fixed costs out of care and reactivates them from settings", () => {
    expect(pageSource).toContain("listFixedCosts().filter((fixedCost) => fixedCost.isActive)");
    expect(editorSource).toContain("Deaktivieren");
    expect(editorSource).not.toContain("Reaktivieren");
    expect(settingsPageSource).toContain("/einstellungen/fixkosten-archiv");
    expect(settingsPageSource).toContain("Fixkosten-Archiv");
    expect(archivePageSource).toContain("Fixkostenarchiv");
    expect(archivePageSource).toContain("listFixedCosts().filter((fixedCost) => !fixedCost.isActive)");
    expect(archivePageSource).toContain("reactivateFixedCostAction");
    expect(settingsActionsSource).toContain("reactivateFixedCostAction");
    expect(settingsActionsSource).toContain("setFixedCostActive(parseFixedCostId(formData), true)");
    expect(settingsActionsSource).toContain("/einstellungen/fixkosten-archiv");
  });

  it("uses a calm care surface instead of an admin table", () => {
    expect(pageSource).toContain("fixed-cost-care-shell");
    expect(pageSource).toContain("fixed-cost-hero-panel");
    expect(editorSource).toContain("fixed-cost-card");
    expect(pageSource).not.toContain("<table");
    expect(pageSource).not.toContain("<thead");
    expect(cssSource).toContain(".fixed-cost-care-shell");
    expect(cssSource).toContain(".fixed-cost-hero-panel");
    expect(cssSource).toContain(".fixed-cost-card");
    expect(cssSource).toContain(".fixed-cost-read-card");
    expect(cssSource).toContain(".fixed-cost-state-dot");
  });
});
