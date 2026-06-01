"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setMonthlyCategoryBudget } from "@/src/budgets/repository";
import { parsePlannedAmountCents } from "@/src/special-budgets/amounts";
import {
  setSpecialBudgetActiveForMonth,
  updateSpecialBudgetPlannedAmountForMonth,
} from "@/src/special-budgets/repository";
import { updateExpenseAssignmentForMonth } from "@/src/transactions/repository";

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

function parseTransactionId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const transactionId = Number.parseInt(value, 10);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("Transaktions-ID ist ungueltig.");
  }

  return transactionId;
}

function parseOptionalPositiveInt(rawValue: FormDataEntryValue | null): number | null {
  const value = toSingleString(rawValue).trim();

  if (value.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Auswahl ist ungueltig.");
  }

  return parsed;
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

    updateSpecialBudgetPlannedAmountForMonth(
      specialBudgetId,
      monthKey,
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
      setSpecialBudgetActiveForMonth(specialBudgetId, monthKey, false);
      revalidatePath("/");
      revalidatePath("/monate");
      revalidatePath(`/monate/${monthKey}`);
      revalidatePath("/sonderbudgets");
      redirect(
        `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderbudget deaktiviert.")}`,
      );
    }

    if (intent === "reactivate") {
      setSpecialBudgetActiveForMonth(specialBudgetId, monthKey, true);
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

export async function updateMonthlyTransactionAssignmentAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));
    const categoryId = parseOptionalPositiveInt(formData.get("categoryId"));
    const specialBudgetId = parseOptionalPositiveInt(formData.get("specialBudgetId"));

    updateExpenseAssignmentForMonth(transactionId, monthKey, {
      categoryId,
      specialBudgetId,
    });

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/transaktionen");
    revalidatePath("/sonderbudgets");
    revalidatePath("/auswertungen");

    redirect(
      `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Zuordnung gespeichert.")}`,
    );
  } catch (error) {
    redirect(
      `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`,
    );
  }
}
