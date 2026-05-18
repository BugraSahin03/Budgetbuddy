import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type SpecialBudgetRepositoryModule = typeof import("@/src/special-budgets/repository");
type DbClientModule = typeof import("@/src/db/client");

let repository: SpecialBudgetRepositoryModule;
let dbClient: DbClientModule;

const TEST_NAME_PREFIX = "TEST-FIN-006-";

function cleanupSpecialBudgets(): void {
  dbClient
    .getDb()
    .prepare("DELETE FROM special_budgets WHERE name LIKE ?")
    .run(`${TEST_NAME_PREFIX}%`);
}

beforeAll(async () => {
  repository = await import("@/src/special-budgets/repository");
  dbClient = await import("@/src/db/client");
});

afterEach(() => {
  cleanupSpecialBudgets();
});

describe("special budgets repository", () => {
  it("creates and lists special budgets with active state", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Raspberry Pi`,
      monthKey: "2026-06",
      plannedAmountCents: 12000,
      note: "Neues Device",
    });

    const budgets = repository.listSpecialBudgets();
    const created = budgets.find((budget) => budget.name === `${TEST_NAME_PREFIX}Raspberry Pi`);

    expect(created).toBeDefined();
    expect(created?.monthKey).toBe("2026-06");
    expect(created?.plannedAmountCents).toBe(12000);
    expect(created?.actualExpenseCents).toBe(0);
    expect(created?.isActive).toBe(true);
  });

  it("returns active options only for the selected month", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Bali`,
      monthKey: "2026-07",
      plannedAmountCents: 45000,
      note: "",
    });

    const created = repository
      .listSpecialBudgets()
      .find((budget) => budget.name === `${TEST_NAME_PREFIX}Bali`);

    expect(created).toBeDefined();

    if (!created) {
      return;
    }

    const optionsBeforeDeactivate = repository.listActiveSpecialBudgetOptions("2026-07");
    expect(optionsBeforeDeactivate.some((option) => option.id === created.id)).toBe(true);

    repository.setSpecialBudgetActive(created.id, false);

    const optionsAfterDeactivate = repository.listActiveSpecialBudgetOptions("2026-07");
    expect(optionsAfterDeactivate.some((option) => option.id === created.id)).toBe(false);
  });

  it("validates month key and prevents duplicates in one month", () => {
    cleanupSpecialBudgets();

    expect(() =>
      repository.createSpecialBudget({
        name: `${TEST_NAME_PREFIX}Invalid Month`,
        monthKey: "07-2026",
        plannedAmountCents: 1000,
        note: "",
      }),
    ).toThrow("Monat muss im Format JJJJ-MM vorliegen.");

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Duplicate`,
      monthKey: "2026-08",
      plannedAmountCents: 1000,
      note: "",
    });

    expect(() =>
      repository.createSpecialBudget({
        name: `${TEST_NAME_PREFIX}Duplicate`,
        monthKey: "2026-08",
        plannedAmountCents: 2000,
        note: "",
      }),
    ).toThrow("Dieses Sonderbudget existiert im gewaehlten Monat bereits.");
  });

  it("builds a 12 month selectable window from a base date", () => {
    const months = repository.getSelectableMonthKeys(new Date("2026-04-17T10:00:00.000Z"));

    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-04");
    expect(months[11]).toBe("2027-03");
  });
});
