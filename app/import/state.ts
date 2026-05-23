import type { SparkasseParseResult } from "@/src/import/sparkasse-csv";

export type ImportPreviewState = {
  result: SparkasseParseResult | null;
  fatalError: string | null;
};

export const importPreviewInitialState: ImportPreviewState = {
  result: null,
  fatalError: null,
};
