"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setMonthlyCategoryBudget } from "@/src/budgets/repository";
import {
  clearFixedCostControlOverrideForMonth,
  closeMonth,
  reopenMonth,
  setFixedCostControlOverrideForMonth,
} from "@/src/months/repository";
import { parsePlannedAmountCents } from "@/src/special-budgets/amounts";
import {
  setSpecialBudgetActiveForMonth,
  updateSpecialBudgetPlannedAmountForMonth,
} from "@/src/special-budgets/repository";
import {
  createManualTransaction,
  deleteImportedTransactionForMonth,
  deleteManualTransaction,
  getActiveCashAccountId,
  type ManualTransactionInput,
  type TransactionType,
  updateManualTransaction,
  updateExpenseAssignmentForMonth,
} from "@/src/transactions/repository";

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

function parseSpecialBudgetId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const specialBudgetId = Number.parseInt(value, 10);

  if (!Number.isInteger(specialBudgetId) || specialBudgetId <= 0) {
    throw new Error("Sonderkategorie-ID ist ungültig.");
  }

  return specialBudgetId;
}

function parseTransactionId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const transactionId = Number.parseInt(value, 10);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("Transaktions-ID ist ungültig.");
  }

  return transactionId;
}

function parseOptionalPositiveInt(
  rawValue: FormDataEntryValue | null,
): number | null {
  const value = toSingleString(rawValue).trim();

  if (value.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Auswahl ist ungültig.");
  }

  return parsed;
}

function parseBudgetAssignment(rawValue: FormDataEntryValue | null): {
  categoryId: number | null;
  specialBudgetId: number | null;
} {
  const assignment = toSingleString(rawValue).trim();

  if (assignment.length === 0) {
    return {
      categoryId: null,
      specialBudgetId: null,
    };
  }

  const categoryMatch = assignment.match(/^category:(\d+)$/);
  if (categoryMatch) {
    return {
      categoryId: Number.parseInt(categoryMatch[1], 10),
      specialBudgetId: null,
    };
  }

  const specialBudgetMatch = assignment.match(/^specialBudget:(\d+)$/);
  if (specialBudgetMatch) {
    return {
      categoryId: null,
      specialBudgetId: Number.parseInt(specialBudgetMatch[1], 10),
    };
  }

  throw new Error("Kategoriezuordnung ist ungültig.");
}

function parseTransactionType(
  rawValue: FormDataEntryValue | null,
): TransactionType {
  const value = toSingleString(rawValue).trim();

  if (
    value === "expense" ||
    value === "income" ||
    value === "transfer" ||
    value === "refund"
  ) {
    return value;
  }

  throw new Error("Transaktionstyp ist ungültig.");
}

function parseAccountId(rawValue: FormDataEntryValue | null): number {
  const value = toSingleString(rawValue).trim();
  const accountId = Number.parseInt(value, 10);

  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new Error("Konto ist ungültig.");
  }

  return accountId;
}

function parseCashToggle(rawValue: FormDataEntryValue | null): boolean {
  return toSingleString(rawValue).trim() === "on";
}

function parseMonthlyManualTransactionInput(
  formData: FormData,
): ManualTransactionInput {
  const assignment = parseBudgetAssignment(formData.get("assignment"));
  const accountId = parseCashToggle(formData.get("useCashAccount"))
    ? getActiveCashAccountId()
    : parseAccountId(formData.get("accountId"));

  return {
    bookingDate: toSingleString(formData.get("bookingDate")),
    effectiveMonthKey: toSingleString(formData.get("effectiveMonthKey")),
    description: toSingleString(formData.get("description")),
    transactionType: parseTransactionType(formData.get("transactionType")),
    amountInput: toSingleString(formData.get("amount")),
    accountId,
    destinationAccountId: parseOptionalPositiveInt(
      formData.get("destinationAccountId"),
    ),
    categoryId: assignment.categoryId,
    specialBudgetId: assignment.specialBudgetId,
  };
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

function monthBookingHref(
  monthKey: string,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);
  const query = searchParams.toString();

  return `/monate/${encodeMessage(monthKey)}${query.length > 0 ? `?${query}` : ""}#monatsbuchungen`;
}

function revalidateMonthContext(monthKey: string): void {
  revalidatePath("/");
  revalidatePath("/monate");
  revalidatePath(`/monate/${monthKey}`);
  revalidatePath("/transaktionen");
  revalidatePath("/import");
  revalidatePath("/sonderbudgets");
  revalidatePath("/budgets");
  revalidatePath("/auswertungen");
}

export async function closeMonthAction(formData: FormData): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();
  let redirectTarget: string;

  try {
    const confirmClose = toSingleString(formData.get("confirmClose")).trim();

    if (confirmClose !== "on") {
      throw new Error("Monatsabschluss muss bewusst bestätigt werden.");
    }

    closeMonth(monthKey);
    revalidateMonthContext(monthKey);

    redirectTarget = `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Monat abgeschlossen.")}`;
  } catch (error) {
    redirectTarget = `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

export async function reopenMonthAction(formData: FormData): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();
  let redirectTarget: string;

  try {
    const confirmReopen = toSingleString(formData.get("confirmReopen")).trim();

    if (confirmReopen !== "on") {
      throw new Error("Wieder öffnen muss bewusst bestätigt werden.");
    }

    reopenMonth(monthKey);
    revalidateMonthContext(monthKey);

    redirectTarget = `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Monat wieder geöffnet.")}`;
  } catch (error) {
    redirectTarget = `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`;
  }

  redirect(redirectTarget);
}

export async function setMonthlyBudgetOverrideAction(
  formData: FormData,
): Promise<never> {
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

export async function updateMonthlySpecialBudgetAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const specialBudgetId = parseSpecialBudgetId(
      formData.get("specialBudgetId"),
    );
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
      `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderkategorie gespeichert.")}`,
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
    const specialBudgetId = parseSpecialBudgetId(
      formData.get("specialBudgetId"),
    );
    const intent = toSingleString(formData.get("intent"));

    if (intent === "deactivate") {
      setSpecialBudgetActiveForMonth(specialBudgetId, monthKey, false);
      revalidatePath("/");
      revalidatePath("/monate");
      revalidatePath(`/monate/${monthKey}`);
      revalidatePath("/sonderbudgets");
      redirect(
        `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderkategorie deaktiviert.")}`,
      );
    }

    if (intent === "reactivate") {
      setSpecialBudgetActiveForMonth(specialBudgetId, monthKey, true);
      revalidatePath("/");
      revalidatePath("/monate");
      revalidatePath(`/monate/${monthKey}`);
      revalidatePath("/sonderbudgets");
      redirect(
        `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Sonderkategorie reaktiviert.")}`,
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
  const keepBookingEdit = formData.has("bookingEdit");
  let redirectTarget: string;

  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));
    const assignment = formData.has("assignment")
      ? parseBudgetAssignment(formData.get("assignment"))
      : {
          categoryId: parseOptionalPositiveInt(formData.get("categoryId")),
          specialBudgetId: parseOptionalPositiveInt(
            formData.get("specialBudgetId"),
          ),
        };

    updateExpenseAssignmentForMonth(transactionId, monthKey, assignment);

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/transaktionen");
    revalidatePath("/sonderbudgets");
    revalidatePath("/auswertungen");

    redirectTarget = monthBookingHref(monthKey, {
      ...(keepBookingEdit ? { bookingEdit: "1" } : {}),
      notice: "Zuordnung gespeichert.",
    });
  } catch (error) {
    redirectTarget = monthBookingHref(monthKey, {
      ...(keepBookingEdit ? { bookingEdit: "1" } : {}),
      error: toErrorMessage(error),
    });
  }

  redirect(redirectTarget);
}

export async function updateMonthlyFixedCostControlOverrideAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();
  let redirectTarget: string;

  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));
    const intent = toSingleString(formData.get("intent")).trim();

    if (intent === "include") {
      setFixedCostControlOverrideForMonth(transactionId, monthKey, "include");
      revalidateMonthContext(monthKey);
      redirectTarget = monthBookingHref(monthKey, {
        bookingEdit: "1",
        notice: "Buchung als Fixkosten-Kontrolle markiert.",
      });
    } else if (intent === "exclude") {
      setFixedCostControlOverrideForMonth(transactionId, monthKey, "exclude");
      revalidateMonthContext(monthKey);
      redirectTarget = monthBookingHref(monthKey, {
        bookingEdit: "1",
        notice: "Fixkosten-Markierung entfernt.",
      });
    } else if (intent === "clear") {
      clearFixedCostControlOverrideForMonth(transactionId, monthKey);
      revalidateMonthContext(monthKey);
      redirectTarget = monthBookingHref(monthKey, {
        bookingEdit: "1",
        notice: "Fixkosten-Markierung entfernt.",
      });
    } else {
      throw new Error("Unbekannte Fixkosten-Aktion.");
    }
  } catch (error) {
    redirectTarget = monthBookingHref(monthKey, {
      bookingEdit: "1",
      error: toErrorMessage(error),
    });
  }

  redirect(redirectTarget);
}

export async function updateMonthlyManualTransactionAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));

    updateManualTransaction(
      transactionId,
      parseMonthlyManualTransactionInput(formData),
    );

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/transaktionen");
    revalidatePath("/sonderbudgets");
    revalidatePath("/auswertungen");

    redirect(
      monthBookingHref(monthKey, {
        bookingEdit: "1",
        notice: "Buchung gespeichert.",
      }),
    );
  } catch (error) {
    redirect(
      monthBookingHref(monthKey, {
        bookingEdit: "1",
        error: toErrorMessage(error),
      }),
    );
  }
}

export async function deleteMonthlyManualTransactionAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));
    const confirmDelete = toSingleString(formData.get("confirmDelete")).trim();

    if (confirmDelete !== "on") {
      throw new Error("Löschen muss bewusst bestätigt werden.");
    }

    deleteManualTransaction(transactionId);

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/transaktionen");
    revalidatePath("/auswertungen");

    redirect(
      monthBookingHref(monthKey, {
        bookingEdit: "1",
        notice: "Buchung gelöscht.",
      }),
    );
  } catch (error) {
    redirect(
      monthBookingHref(monthKey, {
        bookingEdit: "1",
        error: toErrorMessage(error),
      }),
    );
  }
}

export async function deleteMonthlyImportedTransactionAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    const transactionId = parseTransactionId(formData.get("transactionId"));
    const confirmDelete = toSingleString(formData.get("confirmDelete")).trim();

    if (confirmDelete !== "on") {
      throw new Error("Löschen muss bewusst bestätigt werden.");
    }

    deleteImportedTransactionForMonth(transactionId, monthKey);

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/transaktionen");
    revalidatePath("/auswertungen");

    redirect(
      monthBookingHref(monthKey, {
        bookingEdit: "1",
        notice: "Import-Buchung gelöscht.",
      }),
    );
  } catch (error) {
    redirect(
      monthBookingHref(monthKey, {
        bookingEdit: "1",
        error: toErrorMessage(error),
      }),
    );
  }
}

export async function createMonthlyManualTransactionAction(
  formData: FormData,
): Promise<never> {
  const monthKey = toSingleString(formData.get("monthKey")).trim();

  try {
    createManualTransaction(parseMonthlyManualTransactionInput(formData));

    revalidatePath("/");
    revalidatePath("/monate");
    revalidatePath(`/monate/${monthKey}`);
    revalidatePath("/transaktionen");
    revalidatePath("/auswertungen");

    redirect(
      `/monate/${encodeMessage(monthKey)}?notice=${encodeMessage("Monatsbuchung erstellt.")}`,
    );
  } catch (error) {
    redirect(
      `/monate/${encodeMessage(monthKey)}?error=${encodeMessage(toErrorMessage(error))}`,
    );
  }
}
