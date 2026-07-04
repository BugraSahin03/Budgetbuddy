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
  deleteCashTransferImportRule,
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
    throw new Error("Alias-ID ist ungültig.");
  }

  return aliasId;
}

function parseImportRuleId(formData: FormData): number {
  const ruleId = Number.parseInt(String(formData.get("ruleId") ?? ""), 10);

  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    throw new Error("Regel-ID ist ungültig.");
  }

  return ruleId;
}

function assertDeleteConfirmation(formData: FormData): void {
  if (String(formData.get("confirmDelete") ?? "off") !== "on") {
    throw new Error("Löschen muss bestätigt werden.");
  }
}

function parseImportControlPatternInput(formData: FormData) {
  const normalizedFormData = new FormData();

  for (const [key, value] of formData.entries()) {
    normalizedFormData.set(key, value);
  }

  normalizedFormData.set("targetType", "transfer_cash");
  normalizedFormData.set("rulePurpose", "fixed_cost_control");
  normalizedFormData.delete("categoryId");
  normalizedFormData.delete("specialBudgetId");

  return parseRuleInputFromFormData(normalizedFormData);
}

function parseCashTransferRuleInput(formData: FormData) {
  const normalizedFormData = new FormData();

  for (const [key, value] of formData.entries()) {
    normalizedFormData.set(key, value);
  }

  normalizedFormData.set("targetType", "transfer_cash");
  normalizedFormData.set("rulePurpose", "cash_transfer");
  normalizedFormData.delete("categoryId");
  normalizedFormData.delete("specialBudgetId");

  return parseRuleInputFromFormData(normalizedFormData);
}

function parseProjectId(formData: FormData): number {
  const projectId = Number.parseInt(String(formData.get("projectId") ?? ""), 10);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Sonderkategorie ist ungültig.");
  }

  return projectId;
}

function parseCategoryId(formData: FormData): number {
  const categoryId = Number.parseInt(String(formData.get("categoryId") ?? ""), 10);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error("Kategorie-ID ist ungültig.");
  }

  return categoryId;
}

function parseFixedCostId(formData: FormData): number {
  const fixedCostId = Number.parseInt(String(formData.get("fixedCostId") ?? ""), 10);

  if (!Number.isInteger(fixedCostId) || fixedCostId <= 0) {
    throw new Error("Fixkosten-ID ist ungültig.");
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

  redirect("/einstellungen/import-aliase?notice=" + encodeMessage("Import-Alias gelöscht."));
}

export async function createImportRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    createImportRule(parseImportControlPatternInput(formData));
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
      encodeMessage("Fixkosten-Kontrollmuster erstellt."),
  );
}

export async function updateImportRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    updateImportRule(parseImportRuleId(formData), parseImportControlPatternInput(formData));
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
      encodeMessage("Fixkosten-Kontrollmuster gespeichert."),
  );
}

export async function createCashTransferRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    createImportRule(parseCashTransferRuleInput(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/bargeld-transferregeln");
    revalidatePath("/import");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/bargeld-transferregeln?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/bargeld-transferregeln?notice=" +
      encodeMessage("Bargeld-/Transferregel erstellt."),
  );
}

export async function updateCashTransferRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    updateImportRule(parseImportRuleId(formData), parseCashTransferRuleInput(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/bargeld-transferregeln");
    revalidatePath("/import");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/bargeld-transferregeln?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/bargeld-transferregeln?notice=" +
      encodeMessage("Bargeld-/Transferregel gespeichert."),
  );
}

export async function deleteCashTransferRuleSettingsAction(
  formData: FormData,
): Promise<never> {
  let errorMessage: string | null = null;

  try {
    assertDeleteConfirmation(formData);
    deleteCashTransferImportRule(parseImportRuleId(formData));
    revalidatePath("/einstellungen");
    revalidatePath("/einstellungen/bargeld-transferregeln");
    revalidatePath("/import");
    revalidatePath("/monate");
  } catch (error) {
    errorMessage = toErrorMessage(error);
  }

  if (errorMessage) {
    redirect("/einstellungen/bargeld-transferregeln?error=" + encodeMessage(errorMessage));
  }

  redirect(
    "/einstellungen/bargeld-transferregeln?notice=" +
      encodeMessage("Bargeld-/Transferregel gelöscht."),
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
