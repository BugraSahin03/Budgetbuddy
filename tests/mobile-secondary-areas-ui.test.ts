import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-109 mobile secondary areas", () => {
  it("adds mobile-safe styling for budgets, fixed costs, settings and archive surfaces", () => {
    const css = readProjectFile("app/globals.css");
    const settingsPage = readProjectFile("app/einstellungen/page.tsx");

    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain(".budget-category-edit-panel");
    expect(css).toContain(".budget-special-edit-panel");
    expect(css).toContain(".fixed-cost-hero-side");
    expect(css).toContain("max-width: 22.5rem;");
    expect(css).toContain(".fixed-cost-read-grid span");
    expect(css).toContain("padding: 0.48rem 0.6rem;");
    expect(css).toContain(".archive-section-summary");
    expect(css).toContain(".settings-area-card-inner");
    expect(settingsPage).toContain("settings-area-card");
    expect(settingsPage).toContain("settings-area-card-inner");
    expect(settingsPage).toContain("settings-area-icon");
  });

  it("turns the technical transaction fallback tables into mobile cards", () => {
    const css = readProjectFile("app/globals.css");
    const transactionsPage = readProjectFile("app/transaktionen/page.tsx");

    expect(transactionsPage).toContain("transaction-fallback-shell");
    expect(transactionsPage).toContain("transaction-fallback-table-card");
    expect(transactionsPage).toContain("transaction-fallback-table");
    expect(transactionsPage).toContain('data-label="Buchung"');
    expect(transactionsPage).toContain('data-label="Importlauf"');
    expect(css).toContain(".transaction-fallback-table thead");
    expect(css).toContain("content: attr(data-label)");
    expect(css).toContain("grid-template-columns: minmax(5.75rem, 0.42fr) minmax(0, 1fr);");
  });
});
