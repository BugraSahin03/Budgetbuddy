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
const importRuleRepositoryMocks = vi.hoisted(() => ({
  createImportRule: vi.fn(),
  deleteCashTransferImportRule: vi.fn(),
  parseRuleInputFromFormData: vi.fn(),
  updateImportRule: vi.fn(),
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
vi.mock("@/src/import-rules/repository", () => importRuleRepositoryMocks);
vi.mock("@/src/special-budgets/repository", () => specialBudgetRepositoryMocks);
vi.mock("@/src/categories/repository", () => categoryRepositoryMocks);
vi.mock("@/src/fixed-costs/repository", () => fixedCostRepositoryMocks);

import {
  createCashTransferRuleSettingsAction,
  createImportDisplayAliasAction,
  createImportRuleSettingsAction,
  deleteCashTransferRuleSettingsAction,
  deleteImportDisplayAliasAction,
  reactivateCategoryAction,
  reactivateFixedCostAction,
  reactivateSpecialBudgetProjectAction,
  updateCashTransferRuleSettingsAction,
  updateImportDisplayAliasAction,
  updateImportRuleSettingsAction,
} from "@/app/einstellungen/actions";

describe("FIN-059 import display alias actions", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
    repositoryMocks.createImportDisplayAlias.mockReset();
    repositoryMocks.deleteImportDisplayAlias.mockReset();
    repositoryMocks.parseImportDisplayAliasInputFromFormData.mockReset();
    repositoryMocks.updateImportDisplayAlias.mockReset();
    importRuleRepositoryMocks.createImportRule.mockReset();
    importRuleRepositoryMocks.deleteCashTransferImportRule.mockReset();
    importRuleRepositoryMocks.parseRuleInputFromFormData.mockReset();
    importRuleRepositoryMocks.updateImportRule.mockReset();
    specialBudgetRepositoryMocks.reactivateSpecialBudgetProject.mockReset();
    categoryRepositoryMocks.setCategoryActive.mockReset();
    fixedCostRepositoryMocks.setFixedCostActive.mockReset();
    repositoryMocks.parseImportDisplayAliasInputFromFormData.mockReturnValue({
      displayName: "Amazon",
      pattern: "AMZN",
    });
    importRuleRepositoryMocks.parseRuleInputFromFormData.mockImplementation((formData: FormData) => ({
      name: "N26 Sammeltransfer Kontrolle",
      pattern: "N26-Fix.",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: String(formData.get("rulePurpose") ?? "assignment"),
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 60,
    }));
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
      "NEXT_REDIRECT:/einstellungen/import-aliase?notice=Import-Alias%20gel%C3%B6scht.",
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

  it("redirects successful import rule writes to the dedicated settings page", async () => {
    const createData = new FormData();
    const updateData = new FormData();
    updateData.set("ruleId", "5");
    updateData.set("targetType", "category");
    updateData.set("categoryId", "2");
    updateData.set("specialBudgetId", "3");

    await expect(createImportRuleSettingsAction(createData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/import-regeln?notice=Fixkosten-Kontrollmuster%20erstellt.",
    );
    await expect(updateImportRuleSettingsAction(updateData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/import-regeln?notice=Fixkosten-Kontrollmuster%20gespeichert.",
    );

    expect(importRuleRepositoryMocks.createImportRule).toHaveBeenCalledWith({
      name: "N26 Sammeltransfer Kontrolle",
      pattern: "N26-Fix.",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 60,
    });
    expect(importRuleRepositoryMocks.updateImportRule).toHaveBeenCalledWith(5, {
      name: "N26 Sammeltransfer Kontrolle",
      pattern: "N26-Fix.",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: "fixed_cost_control",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 60,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/einstellungen/import-regeln");
    expect(revalidatePathMock).toHaveBeenCalledWith("/import");
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringMatching(/^\/import\?/));
    const parsedUpdateFormData =
      importRuleRepositoryMocks.parseRuleInputFromFormData.mock.calls[1][0] as FormData;
    expect(parsedUpdateFormData.get("targetType")).toBe("transfer_cash");
    expect(parsedUpdateFormData.get("rulePurpose")).toBe("fixed_cost_control");
    expect(parsedUpdateFormData.get("categoryId")).toBeNull();
    expect(parsedUpdateFormData.get("specialBudgetId")).toBeNull();
  });

  it("redirects successful cash transfer rule writes to the dedicated settings page", async () => {
    const createData = new FormData();
    const updateData = new FormData();
    updateData.set("ruleId", "8");
    updateData.set("targetType", "category");
    updateData.set("categoryId", "2");
    updateData.set("specialBudgetId", "3");

    await expect(createCashTransferRuleSettingsAction(createData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/bargeld-transferregeln?notice=Bargeld-%2FTransferregel%20erstellt.",
    );
    await expect(updateCashTransferRuleSettingsAction(updateData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/bargeld-transferregeln?notice=Bargeld-%2FTransferregel%20gespeichert.",
    );

    expect(importRuleRepositoryMocks.createImportRule).toHaveBeenCalledWith({
      name: "N26 Sammeltransfer Kontrolle",
      pattern: "N26-Fix.",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: "cash_transfer",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 60,
    });
    expect(importRuleRepositoryMocks.updateImportRule).toHaveBeenCalledWith(8, {
      name: "N26 Sammeltransfer Kontrolle",
      pattern: "N26-Fix.",
      matchField: "description",
      targetType: "transfer_cash",
      rulePurpose: "cash_transfer",
      categoryId: null,
      specialBudgetId: null,
      isActive: true,
      priority: 60,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/einstellungen/bargeld-transferregeln",
    );
    const parsedUpdateFormData =
      importRuleRepositoryMocks.parseRuleInputFromFormData.mock.calls[1][0] as FormData;
    expect(parsedUpdateFormData.get("targetType")).toBe("transfer_cash");
    expect(parsedUpdateFormData.get("rulePurpose")).toBe("cash_transfer");
    expect(parsedUpdateFormData.get("categoryId")).toBeNull();
    expect(parsedUpdateFormData.get("specialBudgetId")).toBeNull();
  });

  it("deletes cash transfer rules only after explicit confirmation", async () => {
    const missingConfirmationData = new FormData();
    missingConfirmationData.set("ruleId", "8");

    await expect(deleteCashTransferRuleSettingsAction(missingConfirmationData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/bargeld-transferregeln?error=L%C3%B6schen%20muss%20best%C3%A4tigt%20werden.",
    );
    expect(importRuleRepositoryMocks.deleteCashTransferImportRule).not.toHaveBeenCalled();

    const deleteData = new FormData();
    deleteData.set("ruleId", "8");
    deleteData.set("confirmDelete", "on");

    await expect(deleteCashTransferRuleSettingsAction(deleteData)).rejects.toThrow(
      "NEXT_REDIRECT:/einstellungen/bargeld-transferregeln?notice=Bargeld-%2FTransferregel%20gel%C3%B6scht.",
    );

    expect(importRuleRepositoryMocks.deleteCashTransferImportRule).toHaveBeenCalledWith(8);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/einstellungen/bargeld-transferregeln",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/import");
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
