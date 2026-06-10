"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createImportDisplayAlias,
  deleteImportDisplayAlias,
  parseImportDisplayAliasInputFromFormData,
  updateImportDisplayAlias,
} from "@/src/settings/import-display-aliases/repository";
import { reactivateSpecialBudgetProject } from "@/src/special-budgets/repository";

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Einstellung konnte nicht gespeichert werden.";
}

function parseAliasId(formData: FormData): number {
  const aliasId = Number.parseInt(String(formData.get("aliasId") ?? ""), 10);

  if (!Number.isInteger(aliasId) || aliasId <= 0) {
    throw new Error("Alias-ID ist ungueltig.");
  }

  return aliasId;
}

function parseProjectId(formData: FormData): number {
  const projectId = Number.parseInt(String(formData.get("projectId") ?? ""), 10);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Sonderbudget-Vorhaben ist ungueltig.");
  }

  return projectId;
}

export async function createImportDisplayAliasAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    createImportDisplayAlias(parseImportDisplayAliasInputFromFormData(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-aliase");
    revalidatePath("/monate");
    revalidatePath("/transaktionen");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/import-aliase?error=" + encodeMessage(errorMessage));
  }

  redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias erstellt."));
}

export async function updateImportDisplayAliasAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    updateImportDisplayAlias(
      parseAliasId(formData),
      parseImportDisplayAliasInputFromFormData(formData),
    );
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-aliase");
    revalidatePath("/monate");
    revalidatePath("/transaktionen");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/import-aliase?error=" + encodeMessage(errorMessage));
  }

  redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias gespeichert."));
}

export async function deleteImportDisplayAliasAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    deleteImportDisplayAlias(parseAliasId(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-aliase");
    revalidatePath("/monate");
    revalidatePath("/transaktionen");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/import-aliase?error=" + encodeMessage(errorMessage));
  }

  redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias geloescht."));
}

export async function reactivateSpecialBudgetProjectAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    reactivateSpecialBudgetProject(parseProjectId(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/sonderbudget-archiv");
    revalidatePath("/budgets");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/sonderbudget-archiv?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/sonderbudget-archiv?notice=" +
      encodeMessage("Sonderbudget-Vorhaben reaktiviert."),
  );
}
