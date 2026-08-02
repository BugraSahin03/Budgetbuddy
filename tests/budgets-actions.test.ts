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
const { getMonthSnapshot } = await import("@/src/months/repository");
const {
  getSavingsCategoryId,
  listCategories,
  listInactiveCategories,
} = await import("@/src/categories/repository");
const {
  createSpecialBudgetShares,
  listActiveSpecialBudgetProjects,
  listArchivedSpecialBudgetProjects,
} = await import("@/src/special-budgets/repository");

type CategoryFormRow = {
  colorHex: string | null;
  defaultBudgetAmountCents: number | null;
  iconName: string | null;
  id: number;
  isDefault: number;
  name: string;
};

function getCategory(name: string): CategoryFormRow {
  return db
    .prepare(
      `
        SELECT
          id,
          name,
          color_hex AS colorHex,
          icon_name AS iconName,
          is_default AS isDefault,
          default_budget_amount_cents AS defaultBudgetAmountCents
        FROM categories
        WHERE name = ?
        LIMIT 1
      `,
    )
    .get(name) as CategoryFormRow;
}

function appendChangedCategory(
  formData: FormData,
  category: CategoryFormRow,
  changes: { budgetAmount?: string; iconName?: string; name?: string } = {},
): void {
  formData.append("changedCategoryIds", String(category.id));
  formData.set(`name-${category.id}`, changes.name ?? category.name);
  formData.set(`colorHex-${category.id}`, category.colorHex ?? "");
  formData.set(`iconName-${category.id}`, changes.iconName ?? category.iconName ?? "");
  formData.set(
    `budgetAmount-${category.id}`,
    changes.budgetAmount ??
      (category.defaultBudgetAmountCents === null
        ? ""
        : (category.defaultBudgetAmountCents / 100).toFixed(2)),
  );

  if (category.isDefault === 1) {
    formData.set(`isDefault-${category.id}`, "on");
  }
}

function appendProjectFields(
  formData: FormData,
  input: {
    iconName: string;
    plannedAmount: string;
    projectId: number;
    shareId: number;
  },
  markChanged = true,
): void {
  if (markChanged) {
    formData.append("changedSpecialBudgetProjectIds", String(input.projectId));
  }

  formData.append(`specialBudgetShareIds-${input.projectId}`, String(input.shareId));
  formData.set(`specialBudgetIconName-${input.projectId}`, input.iconName);
  formData.set(`plannedAmount-${input.shareId}`, input.plannedAmount);
}

function closeMonth(monthKey: string): void {
  db.prepare(
    `
      INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
      VALUES (?, 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
  ).run(monthKey);
}

describe("budget care actions", () => {
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
    closeMonth("2099-07");

    const projects = listActiveSpecialBudgetProjects();
    const projectA = projects.find((project) => project.name === "FIN-123 Project A");
    const projectB = projects.find((project) => project.name === "FIN-123 Project B");

    expect(projectA).toBeDefined();
    expect(projectB).toBeDefined();

    if (!projectA || !projectB) {
      return;
    }

    const formData = new FormData();
    formData.set("intent", `archiveSpecialBudgetProject:${projectA.projectId}`);
    appendProjectFields(formData, {
      projectId: projectA.projectId,
      shareId: projectA.monthShares[0]!.id,
      iconName: "A2",
      plannedAmount: "250.00",
    });
    appendProjectFields(formData, {
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

  it("updates a category without writing visible unchanged shares from a closed month", async () => {
    createSpecialBudgetShares({
      name: "FIN-124 Closed Project",
      iconName: "C1",
      note: "Unveraendert",
      shares: [{ monthKey: "2099-07", plannedAmountCents: 20000 }],
    });
    closeMonth("2099-07");

    const category = getCategory("Freizeit");
    const project = listActiveSpecialBudgetProjects().find(
      (candidate) => candidate.name === "FIN-124 Closed Project",
    );

    expect(project).toBeDefined();

    if (!project) {
      return;
    }

    const shareBefore = db
      .prepare(
        `
          SELECT planned_amount_cents AS plannedAmountCents,
                 is_active AS isActive,
                 updated_at AS updatedAt
          FROM special_budgets
          WHERE id = ?
        `,
      )
      .get(project.monthShares[0]!.id);
    const projectBefore = db
      .prepare(
        `
          SELECT icon_name AS iconName, status, updated_at AS updatedAt
          FROM special_budget_projects
          WHERE id = ?
        `,
      )
      .get(project.projectId);
    const formData = new FormData();

    formData.set("intent", "saveChanges");
    appendChangedCategory(formData, category, {
      name: "Freizeit & Kultur",
      iconName: "FK",
      budgetAmount: "125.00",
    });
    appendProjectFields(
      formData,
      {
        projectId: project.projectId,
        shareId: project.monthShares[0]!.id,
        iconName: project.iconName ?? "",
        plannedAmount: "200.00",
      },
      false,
    );

    await expect(updateBudgetCategoriesAction(formData)).rejects.toThrow(
      "redirect:/budgets?notice=Budgetpflege%20gespeichert.",
    );

    expect(getCategory("Freizeit & Kultur")).toMatchObject({
      id: category.id,
      iconName: "FK",
      defaultBudgetAmountCents: 12500,
    });
    expect(
      db
        .prepare(
          `
            SELECT planned_amount_cents AS plannedAmountCents,
                   is_active AS isActive,
                   updated_at AS updatedAt
            FROM special_budgets
            WHERE id = ?
          `,
        )
        .get(project.monthShares[0]!.id),
    ).toEqual(shareBefore);
    expect(
      db
        .prepare(
          `
            SELECT icon_name AS iconName, status, updated_at AS updatedAt
            FROM special_budget_projects
            WHERE id = ?
          `,
        )
        .get(project.projectId),
    ).toEqual(projectBefore);
  });

  it("deactivates a category without losing its closed-month transaction or visibility", async () => {
    const category = getCategory("Parkhaus");
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse' LIMIT 1")
      .get() as { id: number };

    db.prepare(
      `
        UPDATE categories
        SET default_budget_amount_cents = NULL
        WHERE id = ?
      `,
    ).run(category.id);
    db.prepare("DELETE FROM monthly_category_budgets WHERE category_id = ?").run(category.id);
    const transactionId = Number(
      db
        .prepare(
          `
            INSERT INTO transactions (
              account_id, transaction_type, booking_date, effective_month_key,
              amount_cents, description, source_type, category_id
            )
            VALUES (?, 'expense', '2099-07-10', '2099-07', -1500,
                    'FIN-124 historisches Parken', 'manual', ?)
          `,
        )
        .run(account.id, category.id).lastInsertRowid,
    );
    closeMonth("2099-07");

    const formData = new FormData();
    formData.set("intent", `deactivateCategory:${category.id}`);

    await expect(updateBudgetCategoriesAction(formData)).rejects.toThrow(
      "redirect:/budgets?edit=1&notice=Kategorie%20deaktiviert.",
    );

    const transaction = db
      .prepare("SELECT category_id AS categoryId FROM transactions WHERE id = ?")
      .get(transactionId) as { categoryId: number };
    const snapshot = getMonthSnapshot("2099-07");

    expect(listInactiveCategories().some((entry) => entry.id === category.id)).toBe(true);
    expect(transaction.categoryId).toBe(category.id);
    expect(snapshot.categoryRows.find((row) => row.categoryId === category.id)).toMatchObject({
      spentAmountCents: 1500,
    });
    expect(snapshot.transactions.find((row) => row.id === transactionId)).toMatchObject({
      categoryId: category.id,
    });
  });

  it("persists other changed objects when a category is intentionally deactivated", async () => {
    createSpecialBudgetShares({
      name: "FIN-124 Open Project",
      iconName: "O1",
      note: "Bleibt aktiv",
      shares: [{ monthKey: "2099-08", plannedAmountCents: 30000 }],
    });

    const categoryToDeactivate = getCategory("Tanken");
    const categoryToUpdate = getCategory("Kleidung");
    const project = listActiveSpecialBudgetProjects().find(
      (candidate) => candidate.name === "FIN-124 Open Project",
    );

    expect(project).toBeDefined();

    if (!project) {
      return;
    }

    const formData = new FormData();
    formData.set("intent", `deactivateCategory:${categoryToDeactivate.id}`);
    appendChangedCategory(formData, categoryToUpdate, {
      name: "Kleidung & Schuhe",
      iconName: "KS",
      budgetAmount: "175.00",
    });
    appendProjectFields(formData, {
      projectId: project.projectId,
      shareId: project.monthShares[0]!.id,
      iconName: "O2",
      plannedAmount: "450.00",
    });

    await expect(updateBudgetCategoriesAction(formData)).rejects.toThrow(
      "redirect:/budgets?edit=1&notice=Kategorie%20deaktiviert.",
    );

    expect(listCategories().find((category) => category.id === categoryToDeactivate.id)?.isActive)
      .toBe(false);
    expect(getCategory("Kleidung & Schuhe")).toMatchObject({
      id: categoryToUpdate.id,
      iconName: "KS",
      defaultBudgetAmountCents: 17500,
    });
    expect(
      listActiveSpecialBudgetProjects().find(
        (candidate) => candidate.projectId === project.projectId,
      ),
    ).toMatchObject({
      iconName: "O2",
      monthShares: [expect.objectContaining({ plannedAmountCents: 45000 })],
    });
  });

  it("keeps the savings category protected from targeted deactivation and rename attempts", async () => {
    const savingsId = getSavingsCategoryId();
    const savings = getCategory("Sparen");
    const deactivateFormData = new FormData();
    deactivateFormData.set("intent", `deactivateCategory:${savingsId}`);

    await expect(updateBudgetCategoriesAction(deactivateFormData)).rejects.toThrow(
      "redirect:/budgets?error=",
    );
    expect(listCategories().find((category) => category.id === savingsId)?.isActive).toBe(true);

    const renameFormData = new FormData();
    renameFormData.set("intent", "saveChanges");
    appendChangedCategory(renameFormData, savings, { name: "Ruecklage" });

    await expect(updateBudgetCategoriesAction(renameFormData)).rejects.toThrow(
      "redirect:/budgets?error=",
    );
    expect(listCategories().find((category) => category.id === savingsId)).toMatchObject({
      name: "Sparen",
      isActive: true,
      isProtected: true,
    });
  });
});
