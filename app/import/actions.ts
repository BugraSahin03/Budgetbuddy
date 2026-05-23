"use server";

import { parseSparkasseCsvToPreview, type SparkasseParseResult } from "@/src/import/sparkasse-csv";

export type ImportPreviewState = {
  result: SparkasseParseResult | null;
  fatalError: string | null;
};

const EMPTY_STATE: ImportPreviewState = {
  result: null,
  fatalError: null,
};

export async function parseSparkasseCsvAction(
  _previousState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const file = formData.get("sparkasseCsv");

  if (!(file instanceof File)) {
    return {
      ...EMPTY_STATE,
      fatalError: "Bitte eine CSV-Datei auswaehlen.",
    };
  }

  if (file.size === 0) {
    return {
      ...EMPTY_STATE,
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
      ...EMPTY_STATE,
      fatalError: "Datei konnte nicht geparst werden.",
    };
  }
}

export { EMPTY_STATE as importPreviewInitialState };
