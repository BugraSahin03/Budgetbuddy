"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createImportDisplayAlias,
  deleteImportDisplayAlias,
  parseImportDisplayAliasInputFromFormData,
  updateImportDisplayAlias,
} from "@/src/settings/import-display-aliases/repository";

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Alias konnte nicht gespeichert werden.";
}

function parseAliasId(formData: FormData): number {
  const aliasId = Number.parseInt(String(formData.get("aliasId") ?? ""), 10);

  if (!Number.isInteger(aliasId) || aliasId <= 0) {
    throw new Error("Alias-ID ist ungueltig.");
  }

  return aliasId;
}

export async function createImportDisplayAliasAction(
  formData: FormData,
): Promise<never> {
  try {
    createImportDisplayAlias(parseImportDisplayAliasInputFromFormData(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-aliase");
    revalidatePath("/monate");
    revalidatePath("/transaktionen");
    redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias erstellt."));
  } catch (error) {
    redirect("/einstellungen/import-aliase?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateImportDisplayAliasAction(
  formData: FormData,
): Promise<never> {
  try {
    updateImportDisplayAlias(
      parseAliasId(formData),
      parseImportDisplayAliasInputFromFormData(formData),
    );
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-aliase");
    revalidatePath("/monate");
    revalidatePath("/transaktionen");
    redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias gespeichert."));
  } catch (error) {
    redirect("/einstellungen/import-aliase?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function deleteImportDisplayAliasAction(
  formData: FormData,
): Promise<never> {
  try {
    deleteImportDisplayAlias(parseAliasId(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-aliase");
    revalidatePath("/monate");
    revalidatePath("/transaktionen");
    redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias geloescht."));
  } catch (error) {
    redirect("/einstellungen/import-aliase?error=" + encodeMessage(toErrorMessage(error)));
  }
}
