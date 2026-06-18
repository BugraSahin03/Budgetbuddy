"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createManualTransaction,
  deleteManualTransaction,
  type ManualTransactionInput,
  type TransactionType,
  updateManualTransaction,
} from "@/src/transactions/repository";

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function toOptionalPositiveInt(rawValue: FormDataEntryValue | null): number | null {
  const value = toSingleString(rawValue).trim();

  if (value.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseTransactionId(rawValue: FormDataEntryValue | null): number {
  const value = toOptionalPositiveInt(rawValue);

  if (!value) {
    throw new Error("Transaktions-ID ist ungültig.");
  }

  return value;
}

function parseTransactionType(rawValue: FormDataEntryValue | null): TransactionType {
  const value = toSingleString(rawValue).trim();

  if (value === "expense" || value === "income" || value === "transfer" || value === "refund") {
    return value;
  }

  throw new Error("Transaktionstyp ist ungültig.");
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

function parseManualTransactionInput(formData: FormData): ManualTransactionInput {
  return {
    bookingDate: toSingleString(formData.get("bookingDate")),
    effectiveMonthKey: toSingleString(formData.get("effectiveMonthKey")),
    description: toSingleString(formData.get("description")),
    transactionType: parseTransactionType(formData.get("transactionType")),
    amountInput: toSingleString(formData.get("amount")),
    accountId: parseTransactionId(formData.get("accountId")),
    destinationAccountId: toOptionalPositiveInt(formData.get("destinationAccountId")),
    categoryId: toOptionalPositiveInt(formData.get("categoryId")),
    specialBudgetId: toOptionalPositiveInt(formData.get("specialBudgetId")),
  };
}

export async function createManualTransactionAction(formData: FormData): Promise<never> {
  try {
    createManualTransaction(parseManualTransactionInput(formData));

    revalidatePath("/transaktionen");
    redirect("/transaktionen?notice=" + encodeMessage("Transaktion erstellt."));
  } catch (error) {
    redirect("/transaktionen?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateManualTransactionAction(formData: FormData): Promise<never> {
  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));
    const intent = toSingleString(formData.get("intent"));

    if (intent === "delete") {
      deleteManualTransaction(transactionId);
      revalidatePath("/transaktionen");
      redirect("/transaktionen?notice=" + encodeMessage("Transaktion gelöscht."));
    }

    updateManualTransaction(transactionId, parseManualTransactionInput(formData));
    revalidatePath("/transaktionen");
    redirect("/transaktionen?notice=" + encodeMessage("Transaktion gespeichert."));
  } catch (error) {
    redirect("/transaktionen?error=" + encodeMessage(toErrorMessage(error)));
  }
}
