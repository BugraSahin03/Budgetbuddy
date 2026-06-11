"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePlannedAmountCents } from "@/src/special-budgets/amounts";
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
    throw new Error("Sonderkategorie-ID ist ungueltig.");
  }

  return specialBudgetId;
}

export async function createSpecialBudgetAction(formData: FormData): Promise<never> {
  try {
    createSpecialBudget({
      name: toSingleString(formData.get("name")),
      monthKey: toSingleString(formData.get("monthKey")),
      plannedAmountCents: parsePlannedAmountCents(
        toSingleString(formData.get("plannedAmount")),
      ),
      note: toSingleString(formData.get("note")),
    });

    revalidatePath("/budgets");
    revalidatePath("/sonderbudgets");
    redirect("/budgets?notice=" + encodeMessage("Sonderkategorie erstellt."));
  } catch (error) {
    redirect("/budgets?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateSpecialBudgetStateAction(formData: FormData): Promise<never> {
  try {
    const specialBudgetId = parseSpecialBudgetId(formData.get("specialBudgetId"));
    const intent = toSingleString(formData.get("intent"));

    if (intent === "deactivate") {
      setSpecialBudgetActive(specialBudgetId, false);
      revalidatePath("/budgets");
      revalidatePath("/sonderbudgets");
      redirect("/budgets?notice=" + encodeMessage("Sonderkategorie deaktiviert."));
    }

    if (intent === "reactivate") {
      setSpecialBudgetActive(specialBudgetId, true);
      revalidatePath("/budgets");
      revalidatePath("/sonderbudgets");
      redirect("/budgets?notice=" + encodeMessage("Sonderkategorie reaktiviert."));
    }

    throw new Error("Unbekannte Aktion.");
  } catch (error) {
    redirect("/budgets?error=" + encodeMessage(toErrorMessage(error)));
  }
}
