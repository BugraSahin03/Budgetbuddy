import "server-only";

import { getDb } from "@/src/db/client";

export const SAVINGS_CATEGORY_SYSTEM_KEY = "savings";
export const SAVINGS_CATEGORY_NAME = "Sparen";
export const SAVINGS_CATEGORY_COLOR_HEX = "#D9F7B5";
export const SAVINGS_CATEGORY_DEFAULT_ICON = "↟";

export type CategoryListItem = {
  id: number;
  name: string;
  colorHex: string | null;
  iconName: string | null;
  systemKey: string | null;
  isDefault: boolean;
  isActive: boolean;
  isProtected: boolean;
  isSavings: boolean;
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

function normalizeComparableName(name: string): string {
  return name.trim().toLocaleLowerCase("de-DE");
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

function isSavingsSystemKey(systemKey: string | null): boolean {
  return systemKey === SAVINGS_CATEGORY_SYSTEM_KEY;
}

function assertCategoryNameIsNotReserved(name: string): void {
  if (normalizeComparableName(name) === normalizeComparableName(SAVINGS_CATEGORY_NAME)) {
    throw new Error("Sparen ist eine geschuetzte Systemkategorie.");
  }
}

function getCategorySystemSnapshot(categoryId: number): {
  id: number;
  name: string;
  systemKey: string | null;
} | null {
  return (
    (getDb()
      .prepare(
        `
          SELECT
            id,
            name,
            system_key AS systemKey
          FROM categories
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(categoryId) as { id: number; name: string; systemKey: string | null } | undefined) ??
    null
  );
}

function assertSavingsCategoryCanBeUpdated(
  category: { systemKey: string | null },
  input: CategoryInput,
): void {
  if (!isSavingsSystemKey(category.systemKey)) {
    return;
  }

  if (
    input.name !== SAVINGS_CATEGORY_NAME ||
    input.isDefault !== true
  ) {
    throw new Error("Sparen ist eine geschuetzte Systemkategorie.");
  }
}

function ensureSavingsCategory(): void {
  getDb()
    .prepare(
      `
        INSERT INTO categories (
          name,
          color_hex,
          icon_name,
          is_default,
          is_active,
          default_budget_amount_cents,
          system_key,
          updated_at
        )
        VALUES (?, ?, ?, 1, 1, NULL, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(name) DO UPDATE SET
          color_hex = excluded.color_hex,
          icon_name = CASE
            WHEN categories.icon_name IS NULL OR TRIM(categories.icon_name) = '' OR categories.icon_name = 'SP'
              THEN excluded.icon_name
            ELSE categories.icon_name
          END,
          is_default = 1,
          is_active = 1,
          default_budget_amount_cents = NULL,
          system_key = ?,
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .run(
      SAVINGS_CATEGORY_NAME,
      SAVINGS_CATEGORY_COLOR_HEX,
      SAVINGS_CATEGORY_DEFAULT_ICON,
      SAVINGS_CATEGORY_SYSTEM_KEY,
      SAVINGS_CATEGORY_SYSTEM_KEY,
    );
}

export function listCategories(): CategoryListItem[] {
  ensureSavingsCategory();

  const rows = getDb()
    .prepare(
      `
        SELECT
          c.id,
          c.name,
          c.color_hex AS colorHex,
          c.icon_name AS iconName,
          c.system_key AS systemKey,
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
    systemKey: string | null;
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
    systemKey: row.systemKey,
    isDefault: mapSqliteBoolean(row.isDefault),
    isActive: mapSqliteBoolean(row.isActive),
    isProtected: isSavingsSystemKey(row.systemKey),
    isSavings: isSavingsSystemKey(row.systemKey),
    monthlyBudgetCount: row.monthlyBudgetCount,
    transactionCount: row.transactionCount,
  }));
}

export function listInactiveCategories(): CategoryListItem[] {
  return listCategories().filter((category) => !category.isActive && !category.isProtected);
}

export function createCategory(input: CategoryInput): void {
  const sanitized = sanitizeInput(input);
  assertCategoryNameIsNotReserved(sanitized.name);

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
  let sanitized = sanitizeInput(input);
  const existingCategory = getCategorySystemSnapshot(categoryId);

  if (!existingCategory) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }

  assertSavingsCategoryCanBeUpdated(existingCategory, sanitized);

  if (isSavingsSystemKey(existingCategory.systemKey)) {
    sanitized = {
      ...sanitized,
      colorHex: SAVINGS_CATEGORY_COLOR_HEX,
    };
  }

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
  const existingCategory = getCategorySystemSnapshot(categoryId);

  if (!existingCategory) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }

  if (!isActive && isSavingsSystemKey(existingCategory.systemKey)) {
    throw new Error("Sparen ist eine geschuetzte Systemkategorie.");
  }

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

export function isSavingsCategoryId(categoryId: number): boolean {
  const category = getCategorySystemSnapshot(categoryId);

  return isSavingsSystemKey(category?.systemKey ?? null);
}

export function getSavingsCategoryId(): number {
  ensureSavingsCategory();

  const row = getDb()
    .prepare(
      `
        SELECT id
        FROM categories
        WHERE system_key = ?
        LIMIT 1
      `,
    )
    .get(SAVINGS_CATEGORY_SYSTEM_KEY) as { id: number } | undefined;

  if (!row) {
    throw new Error("Sparen-Kategorie wurde nicht gefunden.");
  }

  return row.id;
}

export function getSavingsActualCents(monthKey: string): number {
  ensureSavingsCategory();

  const row = getDb()
    .prepare(
      `
        SELECT COALESCE(SUM(-t.amount_cents), 0) AS actualCents
        FROM budget_effective_entries t
        INNER JOIN categories c ON c.id = t.category_id
        WHERE c.system_key = ?
          AND t.transaction_type = 'expense'
          AND t.month_key = ?
      `,
    )
    .get(SAVINGS_CATEGORY_SYSTEM_KEY, monthKey) as { actualCents: number } | undefined;

  return row?.actualCents ?? 0;
}
