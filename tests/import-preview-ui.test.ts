import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-116 and FIN-129 import preview UI", () => {
  it("keeps controls importable and explains duplicates and booking statuses", () => {
    const importForm = readProjectFile("app/import/import-form.tsx");
    const state = readProjectFile("app/import/state.ts");
    const actions = readProjectFile("app/import/actions.ts");

    expect(state).toContain("previewPlan");
    expect(actions).toContain("buildSparkasseImportPreviewPlan");
    expect(importForm).toContain("Wird importiert");
    expect(importForm).toContain("Finale Importliste");
    expect(importForm).toContain("Herausgefiltert");
    expect(importForm).toContain("Wird nicht importiert");
    expect(importForm).toContain("decision.reasonLabel");
    expect(importForm).toContain("Regel: {decision.ruleName}");
    expect(importForm).not.toContain("Fixkosten-Kontrollsicht");
    expect(importForm).not.toContain("Transfer/Bargeld-Regel");
    expect(importForm).toContain("Fixkosten-Kontrolltreffer sind markiert");
    expect(importForm).toContain("Keine Duplikate oder Statusausschlüsse in dieser Vorschau.");
    expect(importForm).toContain('reason === "pending"');
    expect(importForm).toContain('reason === "unknown_status"');
    expect(importForm).toContain("Vorgemerkt:");
    expect(importForm).toContain("Unbekannter Status:");
    expect(importForm).toContain('row.info || "Kein Info-Status"');
    expect(importForm).toContain("Diese Zeilen werden nicht importiert.");
    expect(importForm.indexOf("Herausgefiltert")).toBeLessThan(
      importForm.indexOf("Wird importiert"),
    );
  });
});
