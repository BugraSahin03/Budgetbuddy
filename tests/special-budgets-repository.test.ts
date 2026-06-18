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
  dbClient
    .getDb()
    .prepare("DELETE FROM special_budget_projects WHERE name LIKE ?")
    .run(`${TEST_NAME_PREFIX}%`);
  dbClient
    .getDb()
    .prepare("DELETE FROM monthly_statuses WHERE month_key LIKE '2099-%'")
    .run();
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
    expect(created?.projectId).toEqual(expect.any(Number));
    expect(created?.projectStatus).toBe("active");
  });

  it("groups same-name monthly shares into one multi-month project", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Computer`,
      monthKey: "2026-05",
      plannedAmountCents: 30000,
      note: "Teil 1",
    });
    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Computer`,
      monthKey: "2026-06",
      plannedAmountCents: 30000,
      note: "Teil 2",
    });

    const shares = repository
      .listSpecialBudgets()
      .filter((budget) => budget.name === `${TEST_NAME_PREFIX}Computer`);

    expect(shares).toHaveLength(2);
    expect(new Set(shares.map((budget) => budget.projectId)).size).toBe(1);
    expect(shares[0]?.projectMonthCount).toBe(2);
    expect(shares[0]?.projectPlannedAmountCents).toBe(60000);
  });

  it("creates multiple monthly shares atomically for one project", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudgetShares({
      name: `${TEST_NAME_PREFIX}Furniture`,
      note: "Mehrmonatiges Vorhaben",
      shares: [
        {
          monthKey: "2026-05",
          plannedAmountCents: 20000,
        },
        {
          monthKey: "2026-06",
          plannedAmountCents: 25000,
        },
      ],
    });

    const shares = repository
      .listSpecialBudgets()
      .filter((budget) => budget.name === `${TEST_NAME_PREFIX}Furniture`);

    expect(shares).toHaveLength(2);
    expect(new Set(shares.map((budget) => budget.projectId)).size).toBe(1);
    expect(shares[0]?.projectPlannedAmountCents).toBe(45000);

    expect(() =>
      repository.createSpecialBudgetShares({
        name: `${TEST_NAME_PREFIX}Furniture-Duplicate`,
        note: "",
        shares: [
          {
            monthKey: "2026-07",
            plannedAmountCents: 1000,
          },
          {
            monthKey: "2026-07",
            plannedAmountCents: 2000,
          },
        ],
      }),
    ).toThrow("Eine Sonderkategorie darf pro Vorhaben nur einen Anteil je Monat haben.");
  });

  it("lists active multi-month projects once for budget care", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudgetShares({
      name: `${TEST_NAME_PREFIX}Japan`,
      note: "",
      shares: [
        {
          monthKey: "2026-06",
          plannedAmountCents: 50000,
        },
        {
          monthKey: "2026-07",
          plannedAmountCents: 70000,
        },
      ],
    });

    const projects = repository
      .listActiveSpecialBudgetProjects()
      .filter((project) => project.name === `${TEST_NAME_PREFIX}Japan`);

    expect(projects).toHaveLength(1);
    expect(projects[0]?.monthShares.map((share) => share.monthKey)).toEqual([
      "2026-06",
      "2026-07",
    ]);
    expect(projects[0]?.plannedAmountCents).toBe(120000);
  });

  it("updates icon and monthly share amounts for one special budget project", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudgetShares({
      name: `${TEST_NAME_PREFIX}World Trip`,
      note: "",
      iconName: "WT",
      shares: [
        {
          monthKey: "2026-06",
          plannedAmountCents: 30000,
        },
        {
          monthKey: "2026-07",
          plannedAmountCents: 40000,
        },
      ],
    });

    const project = repository
      .listActiveSpecialBudgetProjects()
      .find((item) => item.name === `${TEST_NAME_PREFIX}World Trip`);

    expect(project?.iconName).toBe("WT");
    expect(project?.monthShares).toHaveLength(2);

    if (!project) {
      return;
    }

    repository.updateSpecialBudgetProject({
      projectId: project.projectId,
      iconName: "JP",
      shares: project.monthShares.map((share) => ({
        id: share.id,
        plannedAmountCents: share.monthKey === "2026-06" ? 35000 : 45000,
      })),
    });

    const updated = repository
      .listActiveSpecialBudgetProjects()
      .find((item) => item.projectId === project.projectId);

    expect(updated?.iconName).toBe("JP");
    expect(updated?.plannedAmountCents).toBe(80000);
    expect(updated?.monthShares.map((share) => share.plannedAmountCents)).toEqual([
      35000,
      45000,
    ]);
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

  it("archives projects when all monthly shares are inactive and can reactivate the latest share", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}ArchiveMe`,
      monthKey: "2026-05",
      plannedAmountCents: 30000,
      note: "",
    });
    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}ArchiveMe`,
      monthKey: "2026-08",
      plannedAmountCents: 40000,
      note: "",
    });

    const createdShares = repository
      .listSpecialBudgets()
      .filter((budget) => budget.name === `${TEST_NAME_PREFIX}ArchiveMe`);
    const projectId = createdShares[0]?.projectId;

    expect(projectId).toEqual(expect.any(Number));

    for (const share of createdShares) {
      repository.setSpecialBudgetActive(share.id, false);
    }

    const archived = repository
      .listArchivedSpecialBudgetProjects()
      .find((project) => project.projectId === projectId);

    expect(archived?.monthCount).toBe(2);
    expect(archived?.plannedAmountCents).toBe(70000);
    expect(archived?.monthShares.map((share) => share.monthKey)).toEqual([
      "2026-05",
      "2026-08",
    ]);

    if (!projectId) {
      return;
    }

    repository.reactivateSpecialBudgetProject(projectId);

    const reactivatedShares = repository
      .listSpecialBudgets()
      .filter((budget) => budget.projectId === projectId);
    const latestShare = reactivatedShares.find((budget) => budget.monthKey === "2026-08");

    expect(latestShare?.isActive).toBe(true);
    expect(repository.listArchivedSpecialBudgetProjects().some((project) => project.projectId === projectId)).toBe(false);
  });

  it("archives an entire active project from budget care", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudgetShares({
      name: `${TEST_NAME_PREFIX}ArchiveProject`,
      note: "",
      shares: [
        {
          monthKey: "2026-09",
          plannedAmountCents: 15000,
        },
        {
          monthKey: "2026-10",
          plannedAmountCents: 25000,
        },
      ],
    });

    const project = repository
      .listActiveSpecialBudgetProjects()
      .find((item) => item.name === `${TEST_NAME_PREFIX}ArchiveProject`);

    expect(project).toBeDefined();

    if (!project) {
      return;
    }

    repository.setSpecialBudgetProjectActive(project.projectId, false);

    expect(
      repository
        .listActiveSpecialBudgetProjects()
        .some((item) => item.projectId === project.projectId),
    ).toBe(false);
    expect(
      repository
        .listArchivedSpecialBudgetProjects()
        .some((item) => item.projectId === project.projectId),
    ).toBe(true);
  });

  it("backfills unlinked inactive monthly shares into the archive", () => {
    cleanupSpecialBudgets();

    dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO special_budgets (
            name,
            month_key,
            planned_amount_cents,
            note,
            is_active
          )
          VALUES (?, '2026-11', 9900, 'Altbestand', 0)
        `,
      )
      .run(`${TEST_NAME_PREFIX}Legacy Archive`);

    const archived = repository
      .listArchivedSpecialBudgetProjects()
      .find((project) => project.name === `${TEST_NAME_PREFIX}Legacy Archive`);

    expect(archived?.monthCount).toBe(1);
    expect(archived?.plannedAmountCents).toBe(9900);
    expect(archived?.status).toBe("archived");
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
    ).toThrow("Diese Sonderkategorie existiert im gewählten Monat bereits.");
  });

  it("builds a 12 month selectable window from a base date", () => {
    const months = repository.getSelectableMonthKeys(new Date("2026-04-17T10:00:00.000Z"));

    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-04");
    expect(months[11]).toBe("2027-03");
  });

  it("updates the planned amount of an existing special budget", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Monitor`,
      monthKey: "2026-09",
      plannedAmountCents: 15000,
      note: "",
    });

    const created = repository
      .listSpecialBudgets()
      .find((budget) => budget.name === `${TEST_NAME_PREFIX}Monitor`);

    expect(created).toBeDefined();

    if (!created) {
      return;
    }

    repository.updateSpecialBudgetPlannedAmount(created.id, 27500);

    const updated = repository
      .listSpecialBudgets()
      .find((budget) => budget.id === created.id);

    expect(updated?.plannedAmountCents).toBe(27500);
    expect(updated?.monthKey).toBe("2026-09");
  });

  it("rejects month-mismatched updates and state changes", () => {
    cleanupSpecialBudgets();

    repository.createSpecialBudget({
      name: `${TEST_NAME_PREFIX}Mismatch`,
      monthKey: "2026-10",
      plannedAmountCents: 15000,
      note: "",
    });

    const created = repository
      .listSpecialBudgets()
      .find((budget) => budget.name === `${TEST_NAME_PREFIX}Mismatch`);

    expect(created).toBeDefined();

    if (!created) {
      return;
    }

    expect(() =>
      repository.updateSpecialBudgetPlannedAmountForMonth(created.id, "2026-11", 18000),
    ).toThrow("Sonderkategorie passt nicht zum ausgewählten Monat.");

    expect(() =>
      repository.setSpecialBudgetActiveForMonth(created.id, "2026-11", false),
    ).toThrow("Sonderkategorie passt nicht zum ausgewählten Monat.");
  });

  it("blocks special budget month shares in closed months", () => {
    cleanupSpecialBudgets();

    dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
          VALUES ('2099-04', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
      )
      .run();

    expect(() =>
      repository.createSpecialBudget({
        name: `${TEST_NAME_PREFIX}ClosedCreate`,
        monthKey: "2099-04",
        plannedAmountCents: 20000,
        note: "",
      }),
    ).toThrow("Monat ist abgeschlossen und kann nicht bearbeitet werden.");

    dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
          VALUES ('2099-05', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
      )
      .run();

    const projectId = Number(
      dbClient
        .getDb()
        .prepare(
          `
            INSERT INTO special_budget_projects (name, status)
            VALUES (?, 'active')
          `,
        )
        .run(`${TEST_NAME_PREFIX}ClosedProject`).lastInsertRowid,
    );
    const shareId = Number(
      dbClient
        .getDb()
        .prepare(
          `
            INSERT INTO special_budgets (
              project_id,
              name,
              month_key,
              planned_amount_cents,
              note,
              is_active
            )
            VALUES (?, ?, '2099-05', 20000, '', 1)
          `,
        )
        .run(projectId, `${TEST_NAME_PREFIX}ClosedProject`).lastInsertRowid,
    );

    expect(() =>
      repository.updateSpecialBudgetPlannedAmountForMonth(
        shareId,
        "2099-05",
        25000,
      ),
    ).toThrow("Monat ist abgeschlossen und kann nicht bearbeitet werden.");

    expect(() =>
      repository.setSpecialBudgetActiveForMonth(shareId, "2099-05", false),
    ).toThrow("Monat ist abgeschlossen und kann nicht bearbeitet werden.");

    expect(() =>
      repository.updateSpecialBudgetProject({
        projectId,
        iconName: null,
        shares: [{ id: shareId, plannedAmountCents: 25000 }],
      }),
    ).toThrow("Monat ist abgeschlossen und kann nicht bearbeitet werden.");
  });
});
