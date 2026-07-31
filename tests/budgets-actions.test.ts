import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  revalidatePath: vi.fn(),
}));

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("next/cache", () => ({
  revalidatePath: navigationMocks.revalidatePath,
}));
vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
}));
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { updateBudgetCategoriesAction } = await import("@/app/budgets/actions");
const {
  createSpecialBudgetShares,
  listActiveSpecialBudgetProjects,
  listArchivedSpecialBudgetProjects,
} = await import("@/src/special-budgets/repository");

function appendProject(
  formData: FormData,
  input: { iconName: string; plannedAmount: string; projectId: number; shareId: number },
): void {
  formData.append("specialBudgetProjectIds", String(input.projectId));
  formData.append(`specialBudgetShareIds-${input.projectId}`, String(input.shareId));
  formData.set(`specialBudgetIconName-${input.projectId}`, input.iconName);
  formData.set(`plannedAmount-${input.shareId}`, input.plannedAmount);
}

describe("FIN-123 budget care actions", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
    navigationMocks.redirect.mockClear();
    navigationMocks.revalidatePath.mockClear();
  });

  afterEach(() => {
    db.close();
  });

  it("archives project A while persisting submitted icon and plan changes for project B", async () => {
    createSpecialBudgetShares({
      name: "FIN-123 Project A",
      iconName: "A1",
      note: "Archivziel",
      shares: [{ monthKey: "2099-07", plannedAmountCents: 20000 }],
    });
    createSpecialBudgetShares({
      name: "FIN-123 Project B",
      iconName: "B1",
      note: "Bleibt aktiv",
      shares: [{ monthKey: "2099-08", plannedAmountCents: 30000 }],
    });

    db.prepare(
      `
        INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
        VALUES ('2099-07', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    ).run();

    const projects = listActiveSpecialBudgetProjects();
    const projectA = projects.find((project) => project.name === "FIN-123 Project A");
    const projectB = projects.find((project) => project.name === "FIN-123 Project B");
    const category = db
      .prepare(
        `
          SELECT id, name, color_hex AS colorHex, icon_name AS iconName,
                 is_default AS isDefault, is_active AS isActive
          FROM categories
          WHERE name = 'Einkauf'
        `,
      )
      .get() as {
      id: number;
      name: string;
      colorHex: string | null;
      iconName: string | null;
      isDefault: number;
      isActive: number;
    };

    expect(projectA).toBeDefined();
    expect(projectB).toBeDefined();

    if (!projectA || !projectB) {
      return;
    }

    const formData = new FormData();
    formData.set("categoryIds", String(category.id));
    formData.set(`name-${category.id}`, category.name);
    formData.set(`colorHex-${category.id}`, category.colorHex ?? "");
    formData.set(`iconName-${category.id}`, category.iconName ?? "");
    formData.set(`budgetAmount-${category.id}`, "300.00");

    if (category.isDefault === 1) {
      formData.set(`isDefault-${category.id}`, "on");
    }

    if (category.isActive === 1) {
      formData.set(`isActive-${category.id}`, "on");
    }

    formData.set("deactivateSpecialBudgetProjectId", String(projectA.projectId));
    appendProject(formData, {
      projectId: projectA.projectId,
      shareId: projectA.monthShares[0]!.id,
      iconName: "A2",
      plannedAmount: "250.00",
    });
    appendProject(formData, {
      projectId: projectB.projectId,
      shareId: projectB.monthShares[0]!.id,
      iconName: "B2",
      plannedAmount: "450.00",
    });

    await expect(updateBudgetCategoriesAction(formData)).rejects.toThrow(
      "redirect:/budgets?edit=1&notice=Sonderkategorie%20archiviert.",
    );

    const archivedA = listArchivedSpecialBudgetProjects().find(
      (project) => project.projectId === projectA.projectId,
    );
    const updatedB = listActiveSpecialBudgetProjects().find(
      (project) => project.projectId === projectB.projectId,
    );

    expect(archivedA?.iconName).toBe("A1");
    expect(archivedA?.monthShares[0]?.plannedAmountCents).toBe(20000);
    expect(updatedB?.iconName).toBe("B2");
    expect(updatedB?.monthShares[0]?.plannedAmountCents).toBe(45000);
  });
});
