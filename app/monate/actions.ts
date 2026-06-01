"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setMonthlyCategoryBudget } from "@/src/budgets/repository";
import { parsePlannedAmountCents } from "@/src/special-budgets/amounts";
import {
  setSpecialBudgetActive,
  updateSpecialBudgetPlannedAmount,
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

function parseSpecialBudgetId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const specialBudgetId = Number.parseInt(value, 10);

  if (!Number.isInteger(specialBudgetId) || specialBudgetId <= 0) {
    throw new Error("Sonderbudget-ID ist ungueltig.");
  }

  return specialBudgetId;
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

export async function setMonthlyBudgetOverrideAction(formData: FormData): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const categoryId = parseCategoryId(formData.get("categoryId"));
    const budgetAmount = toSingleString(formData.get("budgetAmount"));

    setMonthlyCategoryBudget(monthKey, categoryId, budgetAmount);
    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/auswertungen");

    redirect(
      `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Monatsbudget gespeichert.")}`,
    );
  } catch (error) {
    redirect(
      `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`,
    );
  }
}

export async function updateMonthlySpecialBudgetAction(formData: FormData): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const specialBudgetId = parseSpecialBudgetId(formData.get("specialBudgetId"));
    const plannedAmount = toSingleString(formData.get("plannedAmount"));

    updateSpecialBudgetPlannedAmount(
      specialBudgetId,
      parsePlannedAmountCents(plannedAmount),
    );

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/sonderbudgets");
    revalidatePath("/auswertungen");

    redirect(
      `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderbudget gespeichert.")}`,
    );
  } catch (error) {
    redirect(
      `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`,
    );
  }
}

export async function updateMonthlySpecialBudgetStateAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const specialBudgetId = parseSpecialBudgetId(formData.get("specialBudgetId"));
    const intent = toSingleString(formData.get("intent"));

    if (intent === "deactivate") {
      setSpecialBudgetActive(specialBudgetId, false);
      revalidatePath("/");
      revalidatePath("/monate");
      revalidatePath(`/monate/${monthKey}`);
      revalidatePath("/sonderbudgets");
      redirect(
        `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderbudget deaktiviert.")}`,
      );
    }

    if (intent === "reactivate") {
      setSpecialBudgetActive(specialBudgetId, true);
      revalidatePath("/");
      revalidatePath("/monate");
      revalidatePath(`/monate/${monthKey}`);
      revalidatePath("/sonderbudgets");
      redirect(
        `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderbudget reaktiviert.")}`,
      );
    }

    throw new Error("Unbekannte Aktion.");
  } catch (error) {
    redirect(
      `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`,
    );
  }
}
