import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-116 import preview UI", () => {
  it("splits preview rows into importable and filtered control lists", () => {
    const importForm = readProjectFile("app/import/import-form.tsx");
    const state = readProjectFile("app/import/state.ts");
    const actions = readProjectFile("app/import/actions.ts");

    expect(state).toContain("previewPlan");
    expect(actions).toContain("buildSparkasseImportPreviewPlan");
    expect(importForm).toContain("Wird importiert");
    expect(importForm).toContain("Finale Importliste");
    expect(importForm).toContain("Herausgefiltert / Kontrolltreffer");
    expect(importForm).toContain("Nicht in der normalen Importliste");
    expect(importForm).toContain("decision.reasonLabel");
    expect(importForm).toContain("Regel: {decision.ruleName}");
    expect(importForm).not.toContain("Fixkosten-Kontrollsicht");
    expect(importForm).not.toContain("Transfer/Bargeld-Regel");
    expect(importForm.indexOf("Herausgefiltert / Kontrolltreffer")).toBeLessThan(
      importForm.indexOf("Wird importiert"),
    );
  });
});
