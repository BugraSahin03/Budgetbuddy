"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createFixedCost,
  setFixedCostActive,
  type FixedCostInput,
  updateFixedCost,
  updateFixedCostSortOrder,
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
    throw new Error(`${label} ist ungültig.`);
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

function parseIndexedFixedCostInput(formData: FormData, fixedCostId: number): FixedCostInput {
  return {
    name: toSingleString(formData.get(`name-${fixedCostId}`)),
    plannedAmountInput: toSingleString(formData.get(`plannedAmount-${fixedCostId}`)),
    bookingDayOfMonthInput: toSingleString(formData.get(`bookingDayOfMonth-${fixedCostId}`)),
    paymentNote: toSingleString(formData.get(`paymentNote-${fixedCostId}`)),
    note: toSingleString(formData.get(`note-${fixedCostId}`)),
  };
}

function parseFixedCostIds(formData: FormData): number[] {
  return formData
    .getAll("fixedCostIds")
    .map((value) => parsePositiveInt(value, "Fixkosten-ID"));
}

function parseSortOrderIds(formData: FormData): number[] {
  return formData
    .getAll("sortOrderIds")
    .map((value) => parsePositiveInt(value, "Fixkosten-ID"));
}

export async function createFixedCostAction(formData: FormData): Promise<never> {
  const redirectTarget = "/fixkosten?notice=" + encodeMessage("Fixkosten-Eintrag erstellt.");

  try {
    createFixedCost(parseFixedCostInput(formData));
    revalidatePath("/fixkosten");
  } catch (error) {
    redirect("/fixkosten?error=" + encodeMessage(toErrorMessage(error)));
  }

  redirect(redirectTarget);
}

export async function updateFixedCostAction(formData: FormData): Promise<never> {
  let redirectTarget = "/fixkosten?notice=" + encodeMessage("Fixkosten-Einträge gespeichert.");

  try {
    const stateChangeFixedCostId = toSingleString(formData.get("stateChangeFixedCostId"));

    if (stateChangeFixedCostId) {
      const fixedCostId = parsePositiveInt(stateChangeFixedCostId, "Fixkosten-ID");
      const currentlyActive = toSingleString(formData.get(`isActive-${fixedCostId}`)) === "on";
      setFixedCostActive(fixedCostId, !currentlyActive);
      redirectTarget =
        "/fixkosten?edit=1&notice=" +
        encodeMessage(currentlyActive ? "Fixkosten-Eintrag deaktiviert." : "Fixkosten-Eintrag reaktiviert.");
      revalidatePath("/fixkosten");
    } else {
      updateFixedCostSortOrder(parseSortOrderIds(formData));

      for (const fixedCostId of parseFixedCostIds(formData)) {
        updateFixedCost(fixedCostId, parseIndexedFixedCostInput(formData, fixedCostId));
      }

      revalidatePath("/fixkosten");
    }
  } catch (error) {
    redirect("/fixkosten?error=" + encodeMessage(toErrorMessage(error)));
  }

  redirect(redirectTarget);
}
