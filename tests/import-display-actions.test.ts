import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const repositoryMocks = vi.hoisted(() => ({
  createImportDisplayAlias: vi.fn(),
  deleteImportDisplayAlias: vi.fn(),
  parseImportDisplayAliasInputFromFormData: vi.fn(),
  updateImportDisplayAlias: vi.fn(),
}));
const specialBudgetRepositoryMocks = vi.hoisted(() => ({
  reactivateSpecialBudgetProject: vi.fn(),
}));
const categoryRepositoryMocks = vi.hoisted(() => ({
  setCategoryActive: vi.fn(),
}));
const fixedCostRepositoryMocks = vi.hoisted(() => ({
  setFixedCostActive: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/src/settings/import-display-aliases/repository", () => repositoryMocks);
vi.mock("@/src/special-budgets/repository", () => specialBudgetRepositoryMocks);
vi.mock("@/src/categories/repository", () => categoryRepositoryMocks);
vi.mock("@/src/fixed-costs/repository", () => fixedCostRepositoryMocks);

import {
  createImportDisplayAliasAction,
  deleteImportDisplayAliasAction,
  reactivateCategoryAction,
  reactivateFixedCostAction,
  reactivateSpecialBudgetProjectAction,
  updateImportDisplayAliasAction,
} from "@/app/einstellungen/actions";

describe("FIN-059 import display alias actions", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
    repositoryMocks.createImportDisplayAlias.mockReset();
    repositoryMocks.deleteImportDisplayAlias.mockReset();
    repositoryMocks.parseImportDisplayAliasInputFromFormData.mockReset();
    repositoryMocks.updateImportDisplayAlias.mockReset();
    specialBudgetRepositoryMocks.reactivateSpecialBudgetProject.mockReset();
    categoryRepositoryMocks.setCategoryActive.mockReset();
    fixedCostRepositoryMocks.setFixedCostActive.mockReset();
    repositoryMocks.parseImportDisplayAliasInputFromFormData.mockReturnValue({
      displayName: "Amazon",
      pattern: "AMZN",
    });
  });

  it("redirects successful alias writes to notice URLs outside error handling", async () => {
    const createData = new FormData();
    const updateData = new FormData();
    const deleteData = new FormData();
    updateData.set("aliasId", "7");
    deleteData.set("aliasId", "7");

    await expect(createImportDisplayAliasAction(createData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/import-aliase?notice=Import-Alias%20erstellt.",
    );
    await expect(updateImportDisplayAliasAction(updateData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/import-aliase?notice=Import-Alias%20gespeichert.",
    );
    await expect(deleteImportDisplayAliasAction(deleteData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/import-aliase?notice=Import-Alias%20geloescht.",
    );

    expect(repositoryMocks.createImportDisplayAlias).toHaveBeenCalledOnce();
    expect(repositoryMocks.updateImportDisplayAlias).toHaveBeenCalledWith(7, {
      displayName: "Amazon",
      pattern: "AMZN",
    });
    expect(repositoryMocks.deleteImportDisplayAlias).toHaveBeenCalledWith(7);
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining("?error="));
  });

  it("redirects validation or persistence errors to error URLs", async () => {
    repositoryMocks.createImportDisplayAlias.mockImplementationOnce(() => {
      throw new Error("Muster existiert bereits.");
    });

    await expect(createImportDisplayAliasAction(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/import-aliase?error=Muster%20existiert%20bereits.",
    );

    expect(redirectMock).toHaveBeenCalledWith(
      "/einstellungen/import-aliase?error=Muster%20existiert%20bereits.",
    );
  });

  it("reactivates archived special budget projects from settings", async () => {
    const formData = new FormData();
    formData.set("projectId", "42");

    await expect(reactivateSpecialBudgetProjectAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/kategorie-archiv?notice=Sonderkategorie%20reaktiviert.",
    );

    expect(specialBudgetRepositoryMocks.reactivateSpecialBudgetProject).toHaveBeenCalledWith(42);
    expect(revalidatePathMock).toHaveBeenCalledWith("/einstellungen/kategorie-archiv");
    expect(revalidatePathMock).toHaveBeenCalledWith("/einstellungen/sonderbudget-archiv");
    expect(revalidatePathMock).toHaveBeenCalledWith("/budgets");
  });

  it("reactivates archived categories from settings", async () => {
    const formData = new FormData();
    formData.set("categoryId", "9");

    await expect(reactivateCategoryAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/kategorie-archiv?notice=Kategorie%20reaktiviert.",
    );

    expect(categoryRepositoryMocks.setCategoryActive).toHaveBeenCalledWith(9, true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/einstellungen/kategorie-archiv");
    expect(revalidatePathMock).toHaveBeenCalledWith("/budgets");
  });

  it("reactivates archived fixed costs from settings", async () => {
    const formData = new FormData();
    formData.set("fixedCostId", "11");

    await expect(reactivateFixedCostAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/fixkosten-archiv?notice=Fixkosten-Eintrag%20reaktiviert.",
    );

    expect(fixedCostRepositoryMocks.setFixedCostActive).toHaveBeenCalledWith(11, true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/einstellungen/fixkosten-archiv");
    expect(revalidatePathMock).toHaveBeenCalledWith("/fixkosten");
    expect(revalidatePathMock).toHaveBeenCalledWith("/monate");
  });
});
