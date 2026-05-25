"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createFixedCost,
  setFixedCostActive,
  type FixedCostInput,
  updateFixedCost,
} from "@/src/fixed-costs/repository";

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

function parsePositiveInt(rawValue: FormDataEntryValue | null, label: string): number {
  const value = toSingleString(rawValue).trim();
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} ist ungueltig.`);
  }

  return parsed;
}

function parseFixedCostInput(formData: FormData): FixedCostInput {
  return {
    name: toSingleString(formData.get("name")),
    plannedAmountInput: toSingleString(formData.get("plannedAmount")),
    bookingDayOfMonthInput: toSingleString(formData.get("bookingDayOfMonth")),
    paymentNote: toSingleString(formData.get("paymentNote")),
    note: toSingleString(formData.get("note")),
  };
}

export async function createFixedCostAction(formData: FormData): Promise<never> {
  try {
    createFixedCost(parseFixedCostInput(formData));

    revalidatePath("/fixkosten");
    redirect("/fixkosten?notice=" + encodeMessage("Fixkosten-Eintrag erstellt."));
  } catch (error) {
    redirect("/fixkosten?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateFixedCostAction(formData: FormData): Promise<never> {
  try {
    const fixedCostId = parsePositiveInt(formData.get("fixedCostId"), "Fixkosten-ID");
    const intent = toSingleString(formData.get("intent"));

    if (intent === "deactivate") {
      setFixedCostActive(fixedCostId, false);
      revalidatePath("/fixkosten");
      redirect("/fixkosten?notice=" + encodeMessage("Fixkosten-Eintrag deaktiviert."));
    }

    if (intent === "reactivate") {
      setFixedCostActive(fixedCostId, true);
      revalidatePath("/fixkosten");
      redirect("/fixkosten?notice=" + encodeMessage("Fixkosten-Eintrag reaktiviert."));
    }

    updateFixedCost(fixedCostId, parseFixedCostInput(formData));
    revalidatePath("/fixkosten");
    redirect("/fixkosten?notice=" + encodeMessage("Fixkosten-Eintrag gespeichert."));
  } catch (error) {
    redirect("/fixkosten?error=" + encodeMessage(toErrorMessage(error)));
  }
}
