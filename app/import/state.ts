import type { ImportPersistenceResult } from "@/src/import/persistence";
import type { SparkasseParseResult } from "@/src/import/sparkasse-csv";
import type { ImportRuleSuggestion } from "@/src/import-rules/matcher";

export type ImportPreviewState = {
  result: SparkasseParseResult | null;
  fatalError: string | null;
  persisted: ImportPersistenceResult | null;
  suggestions: ImportRuleSuggestion[];
};

export const importPreviewInitialState: ImportPreviewState = {
  result: null,
  fatalError: null,
  persisted: null,
  suggestions: [],
};
