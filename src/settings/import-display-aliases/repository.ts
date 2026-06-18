import "server-only";

import { getDb } from "@/src/db/client";
import type { ImportDisplayAliasMatcher } from "@/src/import/display-name";

export type ImportDisplayAlias = ImportDisplayAliasMatcher & {
  id: number;
};

export type ImportDisplayAliasInput = {
  pattern: string;
  displayName: string;
};

function ensureImportDisplayAliasesTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS import_display_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_import_display_aliases_pattern
      ON import_display_aliases(pattern);
  `);
}

function normalizeInput(input: ImportDisplayAliasInput): ImportDisplayAliasInput {
  const pattern = input.pattern.trim();
  const displayName = input.displayName.trim();

  if (pattern.length < 2 || pattern.length > 120) {
    throw new Error("Alias-Muster muss 2 bis 120 Zeichen lang sein.");
  }

  if (displayName.length < 2 || displayName.length > 80) {
    throw new Error("Anzeigename muss 2 bis 80 Zeichen lang sein.");
  }

  return { pattern, displayName };
}

function assertNoDuplicatePattern(pattern: string, exceptId?: number): void {
  const row = getDb()
    .prepare(
      `
        SELECT id
        FROM import_display_aliases
        WHERE lower(pattern) = lower(?)
          AND (? IS NULL OR id != ?)
        LIMIT 1
      `,
    )
    .get(pattern, exceptId ?? null, exceptId ?? null) as { id: number } | undefined;

  if (row) {
    throw new Error("Für dieses Alias-Muster existiert bereits eine Regel.");
  }
}

export function listImportDisplayAliases(): ImportDisplayAlias[] {
  ensureImportDisplayAliasesTable();

  return getDb()
    .prepare(
      `
        SELECT
          id,
          pattern,
          display_name AS displayName
        FROM import_display_aliases
        ORDER BY length(pattern) DESC, id ASC
      `,
    )
    .all() as ImportDisplayAlias[];
}

export function createImportDisplayAlias(input: ImportDisplayAliasInput): void {
  ensureImportDisplayAliasesTable();
  const normalized = normalizeInput(input);
  assertNoDuplicatePattern(normalized.pattern);

  getDb()
    .prepare(
      `
        INSERT INTO import_display_aliases (pattern, display_name, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .run(normalized.pattern, normalized.displayName);
}

export function updateImportDisplayAlias(
  aliasId: number,
  input: ImportDisplayAliasInput,
): void {
  ensureImportDisplayAliasesTable();
  const normalized = normalizeInput(input);
  assertNoDuplicatePattern(normalized.pattern, aliasId);

  const result = getDb()
    .prepare(
      `
        UPDATE import_display_aliases
        SET
          pattern = ?,
          display_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(normalized.pattern, normalized.displayName, aliasId);

  if (result.changes === 0) {
    throw new Error("Alias wurde nicht gefunden.");
  }
}

export function deleteImportDisplayAlias(aliasId: number): void {
  ensureImportDisplayAliasesTable();

  const result = getDb()
    .prepare("DELETE FROM import_display_aliases WHERE id = ?")
    .run(aliasId);

  if (result.changes === 0) {
    throw new Error("Alias wurde nicht gefunden.");
  }
}

export function parseImportDisplayAliasInputFromFormData(
  formData: FormData,
): ImportDisplayAliasInput {
  return {
    pattern: String(formData.get("pattern") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  };
}
