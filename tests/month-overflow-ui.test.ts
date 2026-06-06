import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-058 month transaction overflow protection", () => {
  it("keeps recent expenses and all bookings width-bound for long imported text", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const globals = readProjectFile("app/globals.css");

    expect(page).toContain('month-reference-panel min-w-0 overflow-hidden bg-white/82');
    expect(page).toContain('month-reference-panel month-disclosure min-w-0 overflow-hidden bg-white/78');
    expect(page).toContain('grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center');
    expect(page).toContain('grid min-w-0 gap-4 md:grid-cols-[auto_minmax(0,1.25fr)_minmax(8.5rem,auto)_minmax(9.5rem,auto)]');
    expect(page).toContain('className="min-w-0"');
    expect(page).toContain('className="min-w-0 flex-1"');
    expect(page).toContain("truncate text-lg font-black");
    expect(page).toContain("inline-flex max-w-full");
    expect(globals).toContain(".month-expense-row");
    expect(globals).toContain("max-width: 100%;");
    expect(globals).toContain("min-width: 0;");
    expect(globals).toContain("overflow: hidden;");
  });
});
