"use server";

import { randomUUID } from "node:crypto";

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

type CachedPreviewFile = {
  fileContent: string;
  filename: string;
};

const previewFileCache = new Map<string, CachedPreviewFile>();

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

async function resolveImportFile(
  previousState: ImportPreviewState,
  formData: FormData,
): Promise<CachedPreviewFile | { error: string }> {
  const file = formData.get("sparkasseCsv");

  if (file instanceof File && file.size > 0) {
    return {
      fileContent: await file.text(),
      filename: file.name || "sparkasse.csv",
    };
  }

  const previewFileToken = previousState.previewFileToken;
  if (previewFileToken) {
    const cached = previewFileCache.get(previewFileToken);

    if (cached) {
      return cached;
    }
  }

  return { error: "Bitte eine CSV-Datei auswaehlen." };
}

export async function parseSparkasseCsvAction(
  previousState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const intent = toSingleString(formData.get("intent"));
  const effectiveMonthKey = toSingleString(formData.get("effectiveMonthKey"));
  const returnMonthKey = toSingleString(formData.get("returnMonthKey")).trim();
  const resolvedFile = await resolveImportFile(previousState, formData);

  if ("error" in resolvedFile) {
    return {
      ...importPreviewInitialState,
      fatalError: resolvedFile.error,
    };
  }

  try {
    const parsed = parseSparkasseCsvToPreview(resolvedFile.fileContent);
    const detectedMonthKey = detectDefaultImportMonthKey(parsed.rows);
    const activeFixedCosts = listFixedCosts().filter((fixedCost) => fixedCost.isActive);

    if (intent === "confirm") {
      const activeRules = listActiveImportRules();
      const persisted = persistSparkasseCsvImport({
        sourceFilename: resolvedFile.filename,
        fileContent: resolvedFile.fileContent,
        effectiveMonthKey,
      });

      if (previousState.previewFileToken) {
        previewFileCache.delete(previousState.previewFileToken);
      }

      revalidatePath("/transaktionen");
      revalidatePath("/import");
      if (returnMonthKey.length > 0) {
        revalidatePath(`/monate/${returnMonthKey}`);
      }

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
        previewFileToken: null,
        previewFilename: null,
      };
    }

    const activeRules = listActiveImportRules();
    const suggestions = buildImportRuleSuggestions({
      rows: parsed.rows,
      rules: activeRules,
      fixedCosts: activeFixedCosts,
    });

    if (previousState.previewFileToken) {
      previewFileCache.delete(previousState.previewFileToken);
    }

    const previewFileToken = randomUUID();
    previewFileCache.set(previewFileToken, resolvedFile);

    return {
      result: parsed,
      fatalError: null,
      persisted: null,
      suggestions,
      detectedMonthKey,
      previewFileToken,
      previewFilename: resolvedFile.filename,
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
