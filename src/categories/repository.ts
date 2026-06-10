import "server-only";

import { getDb } from "@/src/db/client";

export type CategoryListItem = {
  id: number;
  name: string;
  colorHex: string | null;
  iconName: string | null;
  isDefault: boolean;
  isActive: boolean;
  monthlyBudgetCount: number;
  transactionCount: number;
};

export type CategoryInput = {
  name: string;
  colorHex: string | null;
  iconName: string | null;
  isDefault: boolean;
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

function toNullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeName(name: string): string {
  const normalized = name.trim();

  if (normalized.length < 2) {
    throw new Error("Name muss mindestens 2 Zeichen enthalten.");
  }

  if (normalized.length > 60) {
    throw new Error("Name darf maximal 60 Zeichen enthalten.");
  }

  return normalized;
}

function normalizeColorHex(colorHex: string): string | null {
  const normalized = toNullableText(colorHex);

  if (!normalized) {
    return null;
  }

  const upperCased = normalized.toUpperCase();

  if (!HEX_COLOR_PATTERN.test(upperCased)) {
    throw new Error("Farbwert muss im Format #RRGGBB vorliegen.");
  }

  return upperCased;
}

function normalizeIconName(iconName: string): string | null {
  const normalized = toNullableText(iconName);

  if (!normalized) {
    return null;
  }

  if (normalized.length > 24) {
    throw new Error("Icon darf maximal 24 Zeichen enthalten.");
  }

  return normalized;
}

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function sanitizeInput(input: CategoryInput): CategoryInput {
  return {
    name: normalizeName(input.name),
    colorHex: normalizeColorHex(input.colorHex ?? ""),
    iconName: normalizeIconName(input.iconName ?? ""),
    isDefault: input.isDefault,
  };
}

function mapCategoryPersistenceError(error: unknown): Error {
  if (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed: categories.name")
  ) {
    return new Error("Kategorie-Name existiert bereits.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Kategorie konnte nicht gespeichert werden.");
}

export function listCategories(): CategoryListItem[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          c.id,
          c.name,
          c.color_hex AS colorHex,
          c.icon_name AS iconName,
          c.is_default AS isDefault,
          c.is_active AS isActive,
          (
            SELECT COUNT(*)
            FROM monthly_category_budgets mb
            WHERE mb.category_id = c.id
          ) AS monthlyBudgetCount,
          (
            SELECT COUNT(*)
            FROM transactions t
            WHERE t.category_id = c.id
          ) AS transactionCount
        FROM categories c
        ORDER BY c.is_active DESC, c.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{
    id: number;
    name: string;
    colorHex: string | null;
    iconName: string | null;
    isDefault: number;
    isActive: number;
    monthlyBudgetCount: number;
    transactionCount: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    colorHex: row.colorHex,
    iconName: row.iconName,
    isDefault: mapSqliteBoolean(row.isDefault),
    isActive: mapSqliteBoolean(row.isActive),
    monthlyBudgetCount: row.monthlyBudgetCount,
    transactionCount: row.transactionCount,
  }));
}

export function listInactiveCategories(): CategoryListItem[] {
  return listCategories().filter((category) => !category.isActive);
}

export function createCategory(input: CategoryInput): void {
  const sanitized = sanitizeInput(input);

  try {
    getDb()
      .prepare(
        `
          INSERT INTO categories (
            name,
            color_hex,
            icon_name,
            is_default,
            is_active,
            updated_at
          )
          VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `,
      )
      .run(
        sanitized.name,
        sanitized.colorHex,
        sanitized.iconName,
        sanitized.isDefault ? 1 : 0,
      );
  } catch (error) {
    throw mapCategoryPersistenceError(error);
  }
}

export function updateCategory(categoryId: number, input: CategoryInput): void {
  const sanitized = sanitizeInput(input);

  let result: { changes: number };

  try {
    result = getDb()
      .prepare(
        `
          UPDATE categories
          SET
            name = ?,
            color_hex = ?,
            icon_name = ?,
            is_default = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(
        sanitized.name,
        sanitized.colorHex,
        sanitized.iconName,
        sanitized.isDefault ? 1 : 0,
        categoryId,
      );
  } catch (error) {
    throw mapCategoryPersistenceError(error);
  }

  if (result.changes === 0) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }
}

export function setCategoryActive(categoryId: number, isActive: boolean): void {
  const result = getDb()
    .prepare(
      `
        UPDATE categories
        SET
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(isActive ? 1 : 0, categoryId);

  if (result.changes === 0) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }
}
