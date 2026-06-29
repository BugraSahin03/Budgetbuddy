import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-108 mobile month action overlay", () => {
  it("treats the add-booking dialog as a touch-friendly mobile fullscreen flow", () => {
    const overlay = readProjectFile("app/monate/month-action-overlay.tsx");
    const globals = readProjectFile("app/globals.css");

    expect(overlay).toContain("month-action-dialog");
    expect(overlay).toContain("month-action-tabs");
    expect(overlay).toContain("month-action-save-dock");
    expect(overlay).toContain("month-action-cash-toggle");
    expect(overlay).toContain("month-action-tile-grid");
    expect(globals).toContain("@media (max-width: 640px)");
    expect(globals).toContain("height: 100dvh;");
    expect(globals).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(globals).toContain("env(safe-area-inset-bottom)");
    expect(globals).toContain(".month-action-save-dock");
    expect(globals).toContain("position: sticky;");
    expect(globals).toContain("overflow-wrap: anywhere;");
  });

  it("shows embedded CSV previews as mobile cards while keeping the desktop table", () => {
    const importForm = readProjectFile("app/import/import-form.tsx");
    const globals = readProjectFile("app/globals.css");

    expect(importForm).toContain("selectedFilename");
    expect(importForm).toContain("Noch keine Datei ausgewählt");
    expect(importForm).toContain("month-import-preview-cards");
    expect(importForm).toContain("month-import-preview-card");
    expect(importForm).toContain("month-import-preview-table");
    expect(globals).toContain(".month-import-preview-cards");
    expect(globals).toContain(".month-import-preview-card");
    expect(globals).toContain(".month-import-preview-table");
    expect(globals).toContain("display: none;");
  });
});
