"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  buildSparkasseImportPreviewPlan,
  detectDefaultImportMonthKey,
  persistSparkasseCsvImport,
} from "@/src/import/persistence";
import { parseSparkasseCsvToPreview } from "@/src/import/sparkasse-csv";
import { buildImportRuleSuggestions } from "@/src/import-rules/matcher";
import { listActiveIncomeDeductionRules } from "@/src/import-rules/income-deductions";
import { listActiveImportRules } from "@/src/import-rules/repository";

import { type ImportPreviewState, importPreviewInitialState } from "@/app/import/state";

type CachedPreviewFile = {
  fileContent: string;
  expiresAt: number;
  filename: string;
};

type ResolvedImportFile = {
  fileContent: string;
  filename: string;
};

const PREVIEW_FILE_TTL_MS = 10 * 60 * 1000;
const MAX_PREVIEW_FILE_BYTES = 2 * 1024 * 1024;

const previewFileCache = new Map<string, CachedPreviewFile>();

function toSingleString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

async function resolveImportFile(
  previousState: ImportPreviewState,
  formData: FormData,
): Promise<ResolvedImportFile | { error: string }> {
  const file = formData.get("sparkasseCsv");
  const now = Date.now();

  purgeExpiredPreviewFiles(now);

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PREVIEW_FILE_BYTES) {
      return { error: "Die CSV-Datei ist zu groß für die Vorschau." };
    }

    return {
      fileContent: await file.text(),
      filename: file.name || "sparkasse.csv",
    };
  }

  const previewFileToken = previousState.previewFileToken;
  if (previewFileToken) {
    const cached = previewFileCache.get(previewFileToken);

    if (cached) {
      if (cached.expiresAt > now) {
        return {
          fileContent: cached.fileContent,
          filename: cached.filename,
        };
      }

      previewFileCache.delete(previewFileToken);
    }

    return {
      error: "Die geladene Vorschau ist abgelaufen. Bitte die CSV-Datei erneut auswählen.",
    };
  }

  return { error: "Bitte eine CSV-Datei auswählen." };
}

function purgeExpiredPreviewFiles(now: number): void {
  for (const [token, cached] of previewFileCache.entries()) {
    if (cached.expiresAt <= now) {
      previewFileCache.delete(token);
    }
  }
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
    const activeIncomeDeductionRules = listActiveIncomeDeductionRules();

    if (intent === "confirm") {
      const activeRules = listActiveImportRules();
      const suggestions = buildImportRuleSuggestions({
        rows: parsed.rows,
        rules: activeRules,
        incomeDeductionRules: activeIncomeDeductionRules,
      });
      const previewPlan = buildSparkasseImportPreviewPlan({
        rows: parsed.rows,
        suggestions,
        effectiveMonthKey,
      });

      if (previousState.previewFileToken) {
        previewFileCache.delete(previousState.previewFileToken);
      }

      const persisted = persistSparkasseCsvImport({
        sourceFilename: resolvedFile.filename,
        fileContent: resolvedFile.fileContent,
        effectiveMonthKey,
        previewPlan,
      });

      revalidatePath("/transaktionen");
      revalidatePath("/import");
      if (returnMonthKey.length > 0) {
        revalidatePath(`/monate/${returnMonthKey}`);
      }

      return {
        result: parsed,
        fatalError: null,
        persisted,
        suggestions,
        previewPlan,
        detectedMonthKey,
        previewFileToken: null,
        previewFilename: null,
      };
    }

    const activeRules = listActiveImportRules();
    const suggestions = buildImportRuleSuggestions({
      rows: parsed.rows,
      rules: activeRules,
      incomeDeductionRules: activeIncomeDeductionRules,
    });
    const previewPlan = buildSparkasseImportPreviewPlan({
      rows: parsed.rows,
      suggestions,
      effectiveMonthKey,
    });

    if (previousState.previewFileToken) {
      previewFileCache.delete(previousState.previewFileToken);
    }

    const previewFileToken = randomUUID();
    previewFileCache.set(previewFileToken, {
      ...resolvedFile,
      expiresAt: Date.now() + PREVIEW_FILE_TTL_MS,
    });

    return {
      result: parsed,
      fatalError: null,
      persisted: null,
      suggestions,
      previewPlan,
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
