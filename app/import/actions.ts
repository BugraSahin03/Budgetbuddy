"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  detectDefaultImportMonthKey,
  persistSparkasseCsvImport,
} from "@/src/import/persistence";
import { parseSparkasseCsvToPreview } from "@/src/import/sparkasse-csv";
import { buildImportRuleSuggestions } from "@/src/import-rules/matcher";
import { listFixedCosts } from "@/src/fixed-costs/repository";
import {
  createImportRule,
  listActiveImportRules,
  parseRuleInputFromFormData,
  updateImportRule,
} from "@/src/import-rules/repository";

import { type ImportPreviewState, importPreviewInitialState } from "@/app/import/state";

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function parseSparkasseCsvAction(
  _previousState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const file = formData.get("sparkasseCsv");
  const intent = toSingleString(formData.get("intent"));
  const effectiveMonthKey = toSingleString(formData.get("effectiveMonthKey"));

  if (!(file instanceof File)) {
    return {
      ...importPreviewInitialState,
      fatalError: "Bitte eine CSV-Datei auswaehlen.",
    };
  }

  if (file.size === 0) {
    return {
      ...importPreviewInitialState,
      fatalError: "Die ausgewaehlte Datei ist leer.",
    };
  }

  const fileContent = await file.text();

  try {
    const parsed = parseSparkasseCsvToPreview(fileContent);
    const detectedMonthKey = detectDefaultImportMonthKey(parsed.rows);
    const activeFixedCosts = listFixedCosts().filter((fixedCost) => fixedCost.isActive);

    if (intent === "confirm") {
      const activeRules = listActiveImportRules();
      const persisted = persistSparkasseCsvImport({
        sourceFilename: file.name || "sparkasse.csv",
        fileContent,
        effectiveMonthKey,
      });

      revalidatePath("/transaktionen");
      revalidatePath("/import");

      return {
        result: parsed,
        fatalError: null,
        persisted,
        suggestions: buildImportRuleSuggestions({
          rows: parsed.rows,
          rules: activeRules,
          fixedCosts: activeFixedCosts,
        }),
        detectedMonthKey,
      };
    }

    const activeRules = listActiveImportRules();
    const suggestions = buildImportRuleSuggestions({
      rows: parsed.rows,
      rules: activeRules,
      fixedCosts: activeFixedCosts,
    });

    return {
      result: parsed,
      fatalError: null,
      persisted: null,
      suggestions,
      detectedMonthKey,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Datei konnte nicht verarbeitet werden.";

    return {
      ...importPreviewInitialState,
      fatalError: message,
    };
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Regel konnte nicht gespeichert werden.";
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message);
}

export async function createImportRuleAction(formData: FormData): Promise<never> {
  try {
    createImportRule(parseRuleInputFromFormData(formData));
    revalidatePath("/import");
    redirect("/import?notice=" + encodeMessage("Import-Regel erstellt."));
  } catch (error) {
    redirect("/import?error=" + encodeMessage(toErrorMessage(error)));
  }
}

export async function updateImportRuleAction(formData: FormData): Promise<never> {
  try {
    const ruleId = Number.parseInt(String(formData.get("ruleId") ?? ""), 10);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new Error("Regel-ID ist ungueltig.");
    }

    updateImportRule(ruleId, parseRuleInputFromFormData(formData));
    revalidatePath("/import");
    redirect("/import?notice=" + encodeMessage("Import-Regel gespeichert."));
  } catch (error) {
    redirect("/import?error=" + encodeMessage(toErrorMessage(error)));
  }
}
