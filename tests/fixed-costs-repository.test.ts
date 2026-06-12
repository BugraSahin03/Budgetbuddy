import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type FixedCostsModule = typeof import("@/src/fixed-costs/repository");

let dbClient: DbClientModule;
let fixedCosts: FixedCostsModule;

const PREFIX = "TEST-FIN-081-";

function cleanup(): void {
  dbClient.getDb().prepare("DELETE FROM fixed_costs WHERE name LIKE ?").run(`${PREFIX}%`);
}

function namesInTestOrder(): string[] {
  return fixedCosts
    .listFixedCosts()
    .filter((row) => row.name.startsWith(PREFIX))
    .map((row) => row.name);
}

beforeAll(async () => {
  dbClient = await import("@/src/db/client");
  fixedCosts = await import("@/src/fixed-costs/repository");
});

describe("fixed-cost repository ordering", () => {
  it("persists manual order and keeps it stable through edits and activation changes", () => {
    cleanup();

    fixedCosts.createFixedCost({
      name: `${PREFIX}A-Miete`,
      plannedAmountInput: "900,00",
      bookingDayOfMonthInput: "1",
      paymentNote: "",
      note: "",
    });
    fixedCosts.createFixedCost({
      name: `${PREFIX}B-Versicherung`,
      plannedAmountInput: "50,00",
      bookingDayOfMonthInput: "5",
      paymentNote: "",
      note: "",
    });

    const createdRows = fixedCosts
      .listFixedCosts()
      .filter((row) => row.name.startsWith(PREFIX));
    const first = createdRows.find((row) => row.name.endsWith("A-Miete"));
    const second = createdRows.find((row) => row.name.endsWith("B-Versicherung"));

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(namesInTestOrder()).toEqual([`${PREFIX}A-Miete`, `${PREFIX}B-Versicherung`]);

    fixedCosts.updateFixedCostSortOrder([second!.id, first!.id]);

    expect(namesInTestOrder()).toEqual([`${PREFIX}B-Versicherung`, `${PREFIX}A-Miete`]);

    fixedCosts.updateFixedCost(first!.id, {
      name: `${PREFIX}A-Miete`,
      plannedAmountInput: "950,00",
      bookingDayOfMonthInput: "2",
      paymentNote: "Dauerauftrag",
      note: "angepasst",
    });

    expect(namesInTestOrder()).toEqual([`${PREFIX}B-Versicherung`, `${PREFIX}A-Miete`]);

    fixedCosts.setFixedCostActive(first!.id, false);
    fixedCosts.setFixedCostActive(first!.id, true);

    expect(namesInTestOrder()).toEqual([`${PREFIX}B-Versicherung`, `${PREFIX}A-Miete`]);

    cleanup();
  });
});
