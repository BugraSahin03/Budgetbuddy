"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createImportDisplayAlias,
  deleteImportDisplayAlias,
  parseImportDisplayAliasInputFromFormData,
  updateImportDisplayAlias,
} from "@/src/settings/import-display-aliases/repository";
import { setCategoryActive } from "@/src/categories/repository";
import { setFixedCostActive } from "@/src/fixed-costs/repository";
import {
  createImportRule,
  parseRuleInputFromFormData,
  updateImportRule,
} from "@/src/import-rules/repository";
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

function parseImportRuleId(formData: FormData): number {
  const ruleId = Number.parseInt(String(formData.get("ruleId") ?? ""), 10);

  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    throw new Error("Regel-ID ist ungueltig.");
  }

  return ruleId;
}

function parseProjectId(formData: FormData): number {
  const projectId = Number.parseInt(String(formData.get("projectId") ?? ""), 10);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Sonderkategorie ist ungueltig.");
  }

  return projectId;
}

function parseCategoryId(formData: FormData): number {
  const categoryId = Number.parseInt(String(formData.get("categoryId") ?? ""), 10);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error("Kategorie-ID ist ungueltig.");
  }

  return categoryId;
}

function parseFixedCostId(formData: FormData): number {
  const fixedCostId = Number.parseInt(String(formData.get("fixedCostId") ?? ""), 10);

  if (!Number.isInteger(fixedCostId) || fixedCostId <= 0) {
    throw new Error("Fixkosten-ID ist ungueltig.");
  }

  return fixedCostId;
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

export async function createImportRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    createImportRule(parseRuleInputFromFormData(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-regeln");
    revalidatePath("/import");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/import-regeln?error=" + encodeMessage(errorMessage));
  }

  redirect("/einstellungen/import-regeln?notice=" + encodeMessage("Import-Regel erstellt."));
}

export async function updateImportRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    updateImportRule(parseImportRuleId(formData), parseRuleInputFromFormData(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/import-regeln");
    revalidatePath("/import");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/import-regeln?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/import-regeln?notice=" +
      encodeMessage("Import-Regel gespeichert."),
  );
}

export async function reactivateSpecialBudgetProjectAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    reactivateSpecialBudgetProject(parseProjectId(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/sonderbudget-archiv");
    revalidatePath("/einstellungen/kategorie-archiv");
    revalidatePath("/budgets");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/kategorie-archiv?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/kategorie-archiv?notice=" +
      encodeMessage("Sonderkategorie reaktiviert."),
  );
}

export async function reactivateCategoryAction(formData: FormData): Promise<never> {
  let errorMessage: string | null = null;

  try {
    setCategoryActive(parseCategoryId(formData), true);
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/kategorie-archiv");
    revalidatePath("/budgets");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/kategorie-archiv?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/kategorie-archiv?notice=" +
      encodeMessage("Kategorie reaktiviert."),
  );
}

export async function reactivateFixedCostAction(formData: FormData): Promise<never> {
  let errorMessage: string | null = null;

  try {
    setFixedCostActive(parseFixedCostId(formData), true);
    revalidatePath("/");
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/fixkosten-archiv");
    revalidatePath("/fixkosten");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/fixkosten-archiv?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/fixkosten-archiv?notice=" +
      encodeMessage("Fixkosten-Eintrag reaktiviert."),
  );
}
