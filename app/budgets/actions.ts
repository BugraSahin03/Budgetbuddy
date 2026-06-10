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
    throw new Error("Sonderbudget-Vorhaben ist ungueltig.");
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
    redirectTarget = `/budgets?notice=${encodeMessage("Budgettopf angelegt.")}`;
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
      throw new Error("Ein Sonderbudget darf pro Vorhaben nur einen Anteil je Monat haben.");
    }

    createSpecialBudgetShares({
      name,
      note,
      shares,
    });

    refreshBudgetPaths();
    redirectTarget = `/budgets?notice=${encodeMessage("Sonderbudget erstellt.")}`;
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
      setCategoryActive(categoryId, formData.get(`isActive-${categoryId}`) === "on");
      setCategoryDefaultBudget(categoryId, budgetAmount);
    }

    refreshBudgetPaths();
    redirectTarget = `/budgets?notice=${encodeMessage("Kategorien gespeichert.")}`;
  } catch (error) {
    redirectTarget = `/budgets?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

export async function updateBudgetSpecialBudgetStateAction(formData: FormData): Promise<never> {
  let redirectTarget = "/budgets";

  try {
    const specialBudgetProjectId = parseSpecialBudgetProjectId(
      formData.get("specialBudgetProjectId"),
    );
    const intent = toSingleString(formData.get("intent"));

    if (intent !== "deactivateProject") {
      throw new Error("Unbekannte Aktion.");
    }

    setSpecialBudgetProjectActive(specialBudgetProjectId, false);
    refreshBudgetPaths();
    redirectTarget = `/budgets?notice=${encodeMessage("Sonderbudget deaktiviert.")}`;
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
