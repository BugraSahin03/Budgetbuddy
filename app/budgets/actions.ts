"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setMonthlyCategoryBudget } from "@/src/budgets/repository";

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

  return "Monatsbudget konnte nicht gespeichert werden.";
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

export async function setMonthlyBudgetAction(formData: FormData): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const categoryId = parseCategoryId(formData.get("categoryId"));
    const budgetAmount = toSingleString(formData.get("budgetAmount"));

    setMonthlyCategoryBudget(monthKey, categoryId, budgetAmount);
    revalidatePath("/budgets");

    redirect(
      `/budgets?month=${encodeMessage(monthKey)}&notice=${encodeMessage("Monatsbudget gespeichert.")}`,
    );
  } catch (error) {
    redirect(
      `/budgets?month=${encodeMessage(monthKey)}&error=${encodeMessage(toErrorMessage(error))}`,
    );
  }
}
