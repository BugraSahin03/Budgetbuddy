"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setCategoryDefaultBudget } from "@/src/budgets/repository";

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

export async function setCategoryDefaultBudgetAction(formData: FormData): Promise<never> {
  try {
    const categoryId = parseCategoryId(formData.get("categoryId"));
    const budgetAmount = toSingleString(formData.get("budgetAmount"));

    setCategoryDefaultBudget(categoryId, budgetAmount);
    revalidatePath("/budgets");
    revalidatePath("/kategorien");
    revalidatePath("/sonderbudgets");
    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath("/auswertungen");

    redirect(`/budgets?notice=${encodeMessage("Standardbudget gespeichert.")}`);
  } catch (error) {
    redirect(`/budgets?error=${encodeMessage(toErrorMessage(error))}`);
  }
}
