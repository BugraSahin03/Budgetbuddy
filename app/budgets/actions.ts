"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setCategoryDefaultBudget } from "@/src/budgets/repository";
import {
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from "@/src/categories/repository";
import { parsePlannedAmountCents } from "@/src/special-budgets/amounts";
import {
  createSpecialBudgetShares,
  setSpecialBudgetProjectActive,
  updateSpecialBudgetProject,
} from "@/src/special-budgets/repository";

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function parseCategoryId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const categoryId = Number.parseInt(value, 10);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error("Kategorie-ID ist ungueltig.");
  }

  return categoryId;
}

function parseSpecialBudgetProjectId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const specialBudgetProjectId = Number.parseInt(value, 10);

  if (!Number.isInteger(specialBudgetProjectId) || specialBudgetProjectId <= 0) {
    throw new Error("Sonderkategorie ist ungueltig.");
  }

  return specialBudgetProjectId;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Standardbudget konnte nicht gespeichert werden.";
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

function toOptionalString(value: FormDataEntryValue | null): string | null {
  const normalized = toSingleString(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function parseAdditionalSpecialBudgetShares(formData: FormData): Array<{
  monthKey: string;
  plannedAmountCents: number;
}> {
  const monthKeys = formData.getAll("additionalMonthKey").map(toSingleString);
  const plannedAmounts = formData.getAll("additionalPlannedAmount").map(toSingleString);
  const shares: Array<{ monthKey: string; plannedAmountCents: number }> = [];

  for (let index = 0; index < monthKeys.length; index += 1) {
    const monthKey = monthKeys[index]?.trim() ?? "";
    const plannedAmount = plannedAmounts[index]?.trim() ?? "";

    if (monthKey.length === 0 && plannedAmount.length === 0) {
      continue;
    }

    if (monthKey.length === 0 || plannedAmount.length === 0) {
      throw new Error("Weitere Monatsanteile brauchen Monat und Betrag.");
    }

    shares.push({
      monthKey,
      plannedAmountCents: parsePlannedAmountCents(plannedAmount),
    });
  }

  return shares;
}

function parseSpecialBudgetShareIds(formData: FormData): number[] {
  return formData
    .getAll("specialBudgetShareIds")
    .map((value) => Number.parseInt(toSingleString(value), 10))
    .filter((shareId) => Number.isInteger(shareId) && shareId > 0);
}

function parseSpecialBudgetProjectIds(formData: FormData): number[] {
  return formData
    .getAll("specialBudgetProjectIds")
    .map((value) => Number.parseInt(toSingleString(value), 10))
    .filter((projectId) => Number.isInteger(projectId) && projectId > 0);
}

function parseProjectShareIds(formData: FormData, projectId: number): number[] {
  return formData
    .getAll(`specialBudgetShareIds-${projectId}`)
    .map((value) => Number.parseInt(toSingleString(value), 10))
    .filter((shareId) => Number.isInteger(shareId) && shareId > 0);
}

function validateOptionalBudgetAmount(rawValue: string): void {
  const normalized = rawValue.trim();

  if (normalized.length === 0) {
    return;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Budgetbetrag muss eine positive Zahl mit maximal zwei Nachkommastellen sein.");
  }
}

function refreshBudgetPaths(): void {
  revalidatePath("/budgets");
  revalidatePath("/kategorien");
  revalidatePath("/sonderbudgets");
  revalidatePath("/");
  revalidatePath("/monate");
  revalidatePath("/auswertungen");
}

export async function createBudgetCategoryAction(formData: FormData): Promise<never> {
  let redirectTarget = "/budgets";

  try {
    const name = toSingleString(formData.get("name"));
    const normalizedName = name.trim();
    const budgetAmount = toSingleString(formData.get("budgetAmount"));

    validateOptionalBudgetAmount(budgetAmount);

    createCategory({
      name,
      colorHex: toOptionalString(formData.get("colorHex")),
      iconName: toOptionalString(formData.get("iconName")),
      isDefault: formData.get("isDefault") === "on",
    });

    if (budgetAmount.trim().length > 0) {
      const createdCategory = listCategories().find(
        (category) => category.name.toLocaleLowerCase("de-DE") === normalizedName.toLocaleLowerCase("de-DE"),
      );

      if (!createdCategory) {
        throw new Error("Kategorie wurde angelegt, Standardbudget konnte aber nicht zugeordnet werden.");
      }

      setCategoryDefaultBudget(createdCategory.id, budgetAmount);
    }

    refreshBudgetPaths();
    redirectTarget = `/budgets?notice=${encodeMessage("Kategorie angelegt.")}`;
  } catch (error) {
    redirectTarget = `/budgets?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

export async function createBudgetSpecialBudgetAction(formData: FormData): Promise<never> {
  let redirectTarget = "/budgets";

  try {
    const name = toSingleString(formData.get("name"));
    const note = toSingleString(formData.get("note"));
    const iconName = toOptionalString(formData.get("iconName"));
    const primaryMonthKey = toSingleString(formData.get("monthKey"));
    const shares = [
      {
        monthKey: primaryMonthKey,
        plannedAmountCents: parsePlannedAmountCents(
          toSingleString(formData.get("plannedAmount")),
        ),
      },
      ...parseAdditionalSpecialBudgetShares(formData),
    ];
    const duplicateMonthKey = shares.find(
      (share, index) =>
        shares.findIndex((candidate) => candidate.monthKey === share.monthKey) !== index,
    )?.monthKey;

    if (duplicateMonthKey) {
      throw new Error("Eine Sonderkategorie darf pro Vorhaben nur einen Anteil je Monat haben.");
    }

    createSpecialBudgetShares({
      name,
      note,
      iconName,
      shares,
    });

    refreshBudgetPaths();
    redirectTarget = `/budgets?notice=${encodeMessage("Sonderkategorie erstellt.")}`;
  } catch (error) {
    redirectTarget = `/budgets?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

function parseCategoryIds(formData: FormData): number[] {
  return formData
    .getAll("categoryIds")
    .map((value) => Number.parseInt(toSingleString(value), 10))
    .filter((categoryId) => Number.isInteger(categoryId) && categoryId > 0);
}

export async function updateBudgetCategoriesAction(formData: FormData): Promise<never> {
  let redirectTarget = "/budgets";

  try {
    const deactivatedCategoryId = toSingleString(
      formData.get("deactivateCategoryId"),
    ).trim();
    const deactivatedSpecialBudgetProjectId = toSingleString(
      formData.get("deactivateSpecialBudgetProjectId"),
    ).trim();
    const hasImmediateDeactivation =
      deactivatedCategoryId.length > 0 || deactivatedSpecialBudgetProjectId.length > 0;
    const categoryIdToDeactivate =
      deactivatedCategoryId.length > 0 ? parseCategoryId(deactivatedCategoryId) : null;
    const specialBudgetProjectIdToDeactivate =
      deactivatedSpecialBudgetProjectId.length > 0
        ? parseSpecialBudgetProjectId(deactivatedSpecialBudgetProjectId)
        : null;

    const categoryIds = parseCategoryIds(formData);

    if (categoryIds.length === 0) {
      throw new Error("Keine Kategorien zum Speichern gefunden.");
    }

    for (const categoryId of categoryIds) {
      const budgetAmount = toSingleString(formData.get(`budgetAmount-${categoryId}`));

      validateOptionalBudgetAmount(budgetAmount);
      updateCategory(categoryId, {
        name: toSingleString(formData.get(`name-${categoryId}`)),
        colorHex: toOptionalString(formData.get(`colorHex-${categoryId}`)),
        iconName: toOptionalString(formData.get(`iconName-${categoryId}`)),
        isDefault: formData.get(`isDefault-${categoryId}`) === "on",
      });
      setCategoryActive(
        categoryId,
        categoryId !== categoryIdToDeactivate &&
          formData.get(`isActive-${categoryId}`) === "on",
      );
      setCategoryDefaultBudget(categoryId, budgetAmount);
    }

    for (const projectId of parseSpecialBudgetProjectIds(formData)) {
      const shareIds = parseProjectShareIds(formData, projectId);

      if (shareIds.length === 0) {
        continue;
      }

      updateSpecialBudgetProject({
        projectId,
        iconName: toOptionalString(formData.get(`specialBudgetIconName-${projectId}`)),
        shares: shareIds.map((shareId) => ({
          id: shareId,
          plannedAmountCents: parsePlannedAmountCents(
            toSingleString(formData.get(`plannedAmount-${shareId}`)),
          ),
        })),
      });
    }

    if (specialBudgetProjectIdToDeactivate !== null) {
      setSpecialBudgetProjectActive(specialBudgetProjectIdToDeactivate, false);
    }

    refreshBudgetPaths();

    if (hasImmediateDeactivation) {
      redirectTarget = `/budgets?edit=1&notice=${encodeMessage(
        categoryIdToDeactivate !== null
          ? "Kategorie deaktiviert."
          : "Sonderkategorie deaktiviert.",
      )}`;
    } else {
      redirectTarget = `/budgets?notice=${encodeMessage("Budgetpflege gespeichert.")}`;
    }
  } catch (error) {
    redirectTarget = `/budgets?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

export async function updateBudgetSpecialBudgetStateAction(formData: FormData): Promise<never> {
  let redirectTarget = "/budgets";

  try {
    const intent = toSingleString(formData.get("intent"));
    const deactivateProjectPrefix = "deactivateProject:";
    const specialBudgetProjectId = intent.startsWith(deactivateProjectPrefix)
      ? parseSpecialBudgetProjectId(intent.slice(deactivateProjectPrefix.length))
      : parseSpecialBudgetProjectId(formData.get("specialBudgetProjectId"));

    if (intent === "updateProject") {
      const shareIds = parseSpecialBudgetShareIds(formData);

      if (shareIds.length === 0) {
        throw new Error("Keine Monatsanteile zum Speichern gefunden.");
      }

      updateSpecialBudgetProject({
        projectId: specialBudgetProjectId,
        iconName: toOptionalString(formData.get("iconName")),
        shares: shareIds.map((shareId) => ({
          id: shareId,
          plannedAmountCents: parsePlannedAmountCents(
            toSingleString(formData.get(`plannedAmount-${shareId}`)),
          ),
        })),
      });

      refreshBudgetPaths();
      redirectTarget = `/budgets?notice=${encodeMessage("Sonderkategorie gespeichert.")}`;
    } else if (intent.startsWith(deactivateProjectPrefix)) {
      setSpecialBudgetProjectActive(specialBudgetProjectId, false);
      refreshBudgetPaths();
      redirectTarget = `/budgets?notice=${encodeMessage("Sonderkategorie deaktiviert.")}`;
    } else {
      throw new Error("Unbekannte Aktion.");
    }
  } catch (error) {
    redirectTarget = `/budgets?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

export async function setCategoryDefaultBudgetAction(formData: FormData): Promise<never> {
  let redirectTarget = "/budgets";

  try {
    const categoryId = parseCategoryId(formData.get("categoryId"));
    const budgetAmount = toSingleString(formData.get("budgetAmount"));

    setCategoryDefaultBudget(categoryId, budgetAmount);
    refreshBudgetPaths();

    redirectTarget = `/budgets?notice=${encodeMessage("Standardbudget gespeichert.")}`;
  } catch (error) {
    redirectTarget = `/budgets?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}
