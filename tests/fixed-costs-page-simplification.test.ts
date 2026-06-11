import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const pageSource = readFileSync(join(rootDir, "app/fixkosten/page.tsx"), "utf8");
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
    expect(pageSource).toContain('name="plannedAmount"');
    expect(pageSource).toContain('name="bookingDayOfMonth"');
    expect(pageSource).toContain('value={row.isActive ? "deactivate" : "reactivate"}');
    expect(pageSource).toContain("Fixkosten hinzufuegen");
    expect(pageSource).toContain("Bestehende Fixkosten");
  });

  it("uses a calm care surface instead of an admin table", () => {
    expect(pageSource).toContain("fixed-cost-care-shell");
    expect(pageSource).toContain("fixed-cost-hero-panel");
    expect(pageSource).toContain("fixed-cost-card");
    expect(pageSource).not.toContain("<table");
    expect(pageSource).not.toContain("<thead");
    expect(cssSource).toContain(".fixed-cost-care-shell");
    expect(cssSource).toContain(".fixed-cost-hero-panel");
    expect(cssSource).toContain(".fixed-cost-card");
  });
});
