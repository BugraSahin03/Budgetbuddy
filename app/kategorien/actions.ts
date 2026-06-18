"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCategory,
  setCategoryActive,
  updateCategory,
} from "@/src/categories/repository";

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function parseCategoryId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const categoryId = Number.parseInt(value, 10);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error("Kategorie-ID ist ungültig.");
  }

  return categoryId;
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Aktion konnte nicht ausgeführt werden.";
}

export async function createCategoryAction(formData: FormData): Promise<never> {
  try {
    createCategory({
      name: toSingleString(formData.get("name")),
      colorHex: toSingleString(formData.get("colorHex")),
      iconName: toSingleString(formData.get("iconName")),
      isDefault: formData.get("isDefault") === "on",
    });

    revalidatePath("/budgets");
    revalidatePath("/kategorien");
    redirect("/budgets?notice=" + encodeMessage("Kategorie erstellt."));
  } catch (error) {
    redirect("/budgets?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateCategoryAction(formData: FormData): Promise<never> {
  try {
    const categoryId = parseCategoryId(formData.get("categoryId"));
    const intent = toSingleString(formData.get("intent"));

    if (intent === "deactivate") {
      setCategoryActive(categoryId, false);
      revalidatePath("/budgets");
      revalidatePath("/kategorien");
      redirect("/budgets?notice=" + encodeMessage("Kategorie deaktiviert."));
    }

    if (intent === "reactivate") {
      setCategoryActive(categoryId, true);
      revalidatePath("/budgets");
      revalidatePath("/kategorien");
      redirect("/budgets?notice=" + encodeMessage("Kategorie reaktiviert."));
    }

    updateCategory(categoryId, {
      name: toSingleString(formData.get("name")),
      colorHex: toSingleString(formData.get("colorHex")),
      iconName: toSingleString(formData.get("iconName")),
      isDefault: formData.get("isDefault") === "on",
    });

    revalidatePath("/budgets");
    revalidatePath("/kategorien");
    redirect("/budgets?notice=" + encodeMessage("Kategorie gespeichert."));
  } catch (error) {
    redirect("/budgets?error=" + encodeMessage(toErrorMessage(error)));
  }
}
