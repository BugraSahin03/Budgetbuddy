"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSpecialBudget,
  setSpecialBudgetActive,
} from "@/src/special-budgets/repository";

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Aktion konnte nicht ausgefuehrt werden.";
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

function parseSpecialBudgetId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const specialBudgetId = Number.parseInt(value, 10);

  if (!Number.isInteger(specialBudgetId) || specialBudgetId <= 0) {
    throw new Error("Sonderbudget-ID ist ungueltig.");
  }

  return specialBudgetId;
}

function parsePlannedAmountCents(rawValue: FormDataEntryValue | null): number {
  const normalized = toSingleString(rawValue).trim().replace(",", ".");

  if (normalized.length === 0) {
    throw new Error("Geplanter Betrag ist erforderlich.");
  }

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Geplanter Betrag muss 0 oder groesser sein.");
  }

  const cents = Math.round(parsed * 100);

  if (cents > 99_999_999) {
    throw new Error("Geplanter Betrag ist zu gross.");
  }

  return cents;
}

export async function createSpecialBudgetAction(formData: FormData): Promise<never> {
  try {
    createSpecialBudget({
      name: toSingleString(formData.get("name")),
      monthKey: toSingleString(formData.get("monthKey")),
      plannedAmountCents: parsePlannedAmountCents(formData.get("plannedAmount")),
      note: toSingleString(formData.get("note")),
    });

    revalidatePath("/sonderbudgets");
    redirect("/sonderbudgets?notice=" + encodeMessage("Sonderbudget erstellt."));
  } catch (error) {
    redirect("/sonderbudgets?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateSpecialBudgetStateAction(formData: FormData): Promise<never> {
  try {
    const specialBudgetId = parseSpecialBudgetId(formData.get("specialBudgetId"));
    const intent = toSingleString(formData.get("intent"));

    if (intent === "deactivate") {
      setSpecialBudgetActive(specialBudgetId, false);
      revalidatePath("/sonderbudgets");
      redirect("/sonderbudgets?notice=" + encodeMessage("Sonderbudget deaktiviert."));
    }

    if (intent === "reactivate") {
      setSpecialBudgetActive(specialBudgetId, true);
      revalidatePath("/sonderbudgets");
      redirect("/sonderbudgets?notice=" + encodeMessage("Sonderbudget reaktiviert."));
    }

    throw new Error("Unbekannte Aktion.");
  } catch (error) {
    redirect("/sonderbudgets?error=" + encodeMessage(toErrorMessage(error)));
  }
}
