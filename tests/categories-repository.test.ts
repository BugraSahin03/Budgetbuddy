import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const {
  createCategory,
  getSavingsActualCents,
  getSavingsCategoryId,
  listCategories,
  listInactiveCategories,
  setCategoryActive,
  updateCategory,
} = await import("@/src/categories/repository");
const { setCategoryDefaultBudget, setMonthlyCategoryBudget } = await import(
  "@/src/budgets/repository"
);

describe("categories repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("provides savings as a protected active system category", () => {
    const savings = listCategories().find((category) => category.name === "Sparen");

    expect(savings).toMatchObject({
      systemKey: "savings",
      isActive: true,
      isDefault: true,
      isProtected: true,
      isSavings: true,
    });
  });

  it("prevents creating, renaming, or deactivating the protected savings category", () => {
    const savingsId = getSavingsCategoryId();

    expect(() =>
      createCategory({
        name: "Sparen",
        colorHex: null,
        iconName: null,
        isDefault: true,
      }),
    ).toThrow("geschuetzte Systemkategorie");

    expect(() =>
      updateCategory(savingsId, {
        name: "Ruecklage",
        colorHex: null,
        iconName: "SP",
        isDefault: true,
      }),
    ).toThrow("geschuetzte Systemkategorie");

    expect(() => setCategoryActive(savingsId, false)).toThrow(
      "geschuetzte Systemkategorie",
    );

    expect(listInactiveCategories().some((category) => category.id === savingsId)).toBe(false);
  });

  it("does not allow global or monthly planned budgets for savings", () => {
    const savingsId = getSavingsCategoryId();

    expect(() => setCategoryDefaultBudget(savingsId, "100.00")).toThrow(
      "keinen Planwert",
    );
    expect(() => setMonthlyCategoryBudget("2026-06", savingsId, "100.00")).toThrow(
      "keinen Planwert",
    );
  });

  it("tracks savings actuals from real assigned expense transactions", () => {
    const savingsId = getSavingsCategoryId();
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse' LIMIT 1")
      .get() as { id: number };
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES
          (?, 'expense', '2026-06-01', '2026-06', -2500, 'Sparrate Juni', 'manual', ?),
          (?, 'expense', '2026-06-02', '2026-06', -500, 'Zweite Sparrate', 'import', ?),
          (?, 'expense', '2026-06-03', '2026-06', -900, 'Einkauf', 'manual', ?),
          (?, 'expense', '2026-07-01', '2026-07', -700, 'Sparrate Juli', 'manual', ?)
      `,
    ).run(
      account.id,
      savingsId,
      account.id,
      savingsId,
      account.id,
      einkauf.id,
      account.id,
      savingsId,
    );

    expect(getSavingsActualCents("2026-06")).toBe(3000);
  });
});
