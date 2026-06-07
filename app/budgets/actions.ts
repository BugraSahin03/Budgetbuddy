"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setCategoryDefaultBudget } from "@/src/budgets/repository";
import { createCategory, listCategories } from "@/src/categories/repository";

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
    redirect(`/budgets?notice=${encodeMessage("Budgettopf angelegt.")}`);
  } catch (error) {
    redirect(`/budgets?error=${encodeMessage(toErrorMessage(error))}`);
  }
}

export async function setCategoryDefaultBudgetAction(formData: FormData): Promise<never> {
  try {
    const categoryId = parseCategoryId(formData.get("categoryId"));
    const budgetAmount = toSingleString(formData.get("budgetAmount"));

    setCategoryDefaultBudget(categoryId, budgetAmount);
    refreshBudgetPaths();

    redirect(`/budgets?notice=${encodeMessage("Standardbudget gespeichert.")}`);
  } catch (error) {
    redirect(`/budgets?error=${encodeMessage(toErrorMessage(error))}`);
  }
}
