import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-075 month comparison UI", () => {
  it("keeps the month comparison focused on income, expenses and savings", () => {
    const page = readProjectFile("app/monatsvergleich/page.tsx");

    expect(page).toContain("listMonthComparison()");
    expect(page).toContain("month.incomeCents");
    expect(page).toContain("month.expenseCents");
    expect(page).toContain("month.savingsCents");
    expect(page).toContain("Einnahmen");
    expect(page).toContain("Ausgaben");
    expect(page).toContain("Gespart");
    expect(page).toContain("Ausgaben inklusive Fixkosten");
    expect(page).not.toContain("savedLabel");
    expect(page).not.toContain("savedTone");
    expect(page).not.toContain("Überschuss");
    expect(page).not.toContain("Defizit");
    expect(page).not.toContain("MonthChip");
    expect(page).not.toContain("{month.monthKey}</");
    expect(page).not.toContain("Monat öffnen");
  });

  it("groups month rows into collapsible year books", () => {
    const page = readProjectFile("app/monatsvergleich/page.tsx");

    expect(page).toContain("groupMonthsByYear(trendRows)");
    expect(page).toContain("<details");
    expect(page).toContain("open");
    expect(page).toContain("Zahlenbuch");
    expect(page).toContain("group.year");
  });
});

describe("FIN-111 month comparison trends", () => {
  it("adds calm trend and previous-month delta information without changing savings semantics", () => {
    const page = readProjectFile("app/monatsvergleich/page.tsx");
    const trendChart = readProjectFile("app/monatsvergleich/month-trend-chart.tsx");

    expect(page).toContain("buildTrendRows(months)");
    expect(page).toContain("buildTrendSummaries(trendRows)");
    expect(trendChart).toContain("Finanzspur der letzten Monate");
    expect(trendChart).toContain("aria-expanded");
    expect(trendChart).toContain("month-trend-chart-panel");
    expect(page).toContain("Veränderung");
    expect(page).toContain("previousMonthLabel");
    expect(page).toContain("month.savingsCents");
    expect(page).toContain("savingsDeltaCents");
    expect(page).not.toContain("incomeCents - month.expenseCents");
    expect(page).not.toContain("incomeCents - expenseCents");
  });
});
