import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("FIN-120 income deductions UI", () => {
  it("provides settings maintenance, import visibility and monthly explanation", () => {
    const settings = read("app/einstellungen/page.tsx");
    const rulesPage = read("app/einstellungen/einkommensabzuege/page.tsx");
    const importForm = read("app/import/import-form.tsx");
    const importPersistence = read("src/import/persistence.ts");
    const monthPage = read("app/monate/[monthKey]/page.tsx");

    expect(settings).toContain('href: "/einstellungen/einkommensabzuege"');
    expect(rulesPage).toContain("Einkommensabzüge reduzieren die bereinigten Einnahmen");
    expect(rulesPage).toContain("createIncomeDeductionRuleAction");
    expect(rulesPage).toContain("updateIncomeDeductionRuleAction");
    expect(rulesPage).toContain("deleteIncomeDeductionRuleAction");
    expect(importPersistence).toContain("Einkommensabzug bereits vorhanden");
    expect(importForm).toContain("werden nicht als normale Ausgabe gezählt");
    expect(monthPage).toContain("incomeDeductionCents");
    expect(monthPage).toContain("Einkommensabzug");
  });
});
