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
    expect(page).toContain('grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]');
    expect(page).toContain('className="min-w-0 flex-1"');
    expect(page).toContain("truncate text-base font-extrabold");
    expect(page).toContain("mt-2 flex flex-wrap items-center gap-2");
    expect(globals).toContain(".month-expense-row");
    expect(globals).toContain("max-width: 100%;");
    expect(globals).toContain("min-width: 0;");
    expect(globals).toContain("overflow: hidden;");
  });
});
