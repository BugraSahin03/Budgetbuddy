import type { ImportPersistenceResult } from "@/src/import/persistence";
import type { SparkasseParseResult } from "@/src/import/sparkasse-csv";

export type ImportPreviewState = {
  result: SparkasseParseResult | null;
  fatalError: string | null;
  persisted: ImportPersistenceResult | null;
};

export const importPreviewInitialState: ImportPreviewState = {
  result: null,
  fatalError: null,
  persisted: null,
};
