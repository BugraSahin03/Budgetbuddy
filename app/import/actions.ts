"use server";

import { type ImportPreviewState, importPreviewInitialState } from "@/app/import/state";
import { parseSparkasseCsvToPreview } from "@/src/import/sparkasse-csv";

export async function parseSparkasseCsvAction(
  _previousState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const file = formData.get("sparkasseCsv");

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
    const result = parseSparkasseCsvToPreview(fileContent);

    return {
      result,
      fatalError: null,
    };
  } catch {
    return {
      ...importPreviewInitialState,
      fatalError: "Datei konnte nicht geparst werden.",
    };
  }
}
