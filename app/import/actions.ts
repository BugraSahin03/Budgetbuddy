"use server";

import { revalidatePath } from "next/cache";

import { persistSparkasseCsvImport } from "@/src/import/persistence";
import { parseSparkasseCsvToPreview } from "@/src/import/sparkasse-csv";

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

    if (intent === "confirm") {
      const persisted = persistSparkasseCsvImport({
        sourceFilename: file.name || "sparkasse.csv",
        fileContent,
      });

      revalidatePath("/transaktionen");
      revalidatePath("/import");

      return {
        result: parsed,
        fatalError: null,
        persisted,
      };
    }

    return {
      result: parsed,
      fatalError: null,
      persisted: null,
    };
  } catch {
    return {
      ...importPreviewInitialState,
      fatalError: "Datei konnte nicht verarbeitet werden.",
    };
  }
}
