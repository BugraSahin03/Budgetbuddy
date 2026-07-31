import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const {
  listCategoryBudgetDefaults,
  listMonthlyBudgetCategories,
  setCategoryDefaultBudget,
  setMonthlyCategoryBudget,
} = await import("@/src/budgets/repository");

describe("monthly budget repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);

    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse' LIMIT 1")
      .get() as { id: number };
    const category = db
      .prepare("SELECT id FROM categories WHERE name = 'Freizeit' LIMIT 1")
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
        VALUES (?, 'expense', '2026-05-12', '2026-05', -1200, 'Kino', 'manual', ?)
      `,
    ).run(account.id, category.id);

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
        VALUES (?, 'expense', '2026-06-02', '2026-06', -2300, 'Konzert', 'manual', ?)
      `,
    ).run(account.id, category.id);

    db.prepare(
      `
        UPDATE categories
        SET default_budget_amount_cents = 8000
        WHERE id = ?
      `,
    ).run(category.id);

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (
          month_key,
          category_id,
          budget_amount_cents
        )
        VALUES ('2026-06', ?, 5000)
      `,
    ).run(category.id);
  });

  afterEach(() => {
    db.close();
  });

  it("falls back to the global default budget when no month override exists", () => {
    const rows = listMonthlyBudgetCategories("2026-05");
    const freizeit = rows.find((row) => row.categoryName === "Freizeit");

    expect(freizeit?.defaultBudgetAmountCents).toBe(8000);
    expect(freizeit?.monthOverrideAmountCents).toBeNull();
    expect(freizeit?.budgetAmountCents).toBe(8000);
    expect(freizeit?.spentAmountCents).toBe(1200);
    expect(freizeit?.remainingAmountCents).toBe(6800);
  });

  it("uses a month override without changing the global default", () => {
    const may = listMonthlyBudgetCategories("2026-05").find(
      (row) => row.categoryName === "Freizeit",
    );
    const june = listMonthlyBudgetCategories("2026-06").find(
      (row) => row.categoryName === "Freizeit",
    );

    expect(may?.budgetAmountCents).toBe(8000);
    expect(may?.monthOverrideAmountCents).toBeNull();
    expect(june?.budgetAmountCents).toBe(5000);
    expect(june?.monthOverrideAmountCents).toBe(5000);
    expect(june?.defaultBudgetAmountCents).toBe(8000);
  });

  it("can create and clear monthly budget overrides without deleting the global default", () => {
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

    setCategoryDefaultBudget(einkauf.id, "175.00");
    setMonthlyCategoryBudget("2026-05", einkauf.id, "249.90");

    let row = db
      .prepare(
        `
          SELECT budget_amount_cents
          FROM monthly_category_budgets
          WHERE month_key = '2026-05' AND category_id = ?
        `,
      )
      .get(einkauf.id) as { budget_amount_cents: number } | undefined;

    expect(row?.budget_amount_cents).toBe(24990);

    let effective = listMonthlyBudgetCategories("2026-05").find(
      (budgetRow) => budgetRow.categoryId === einkauf.id,
    );

    expect(effective?.defaultBudgetAmountCents).toBe(17500);
    expect(effective?.monthOverrideAmountCents).toBe(24990);
    expect(effective?.budgetAmountCents).toBe(24990);

    setMonthlyCategoryBudget("2026-05", einkauf.id, "");

    row = db
      .prepare(
        `
          SELECT budget_amount_cents
          FROM monthly_category_budgets
          WHERE month_key = '2026-05' AND category_id = ?
        `,
      )
      .get(einkauf.id) as { budget_amount_cents: number } | undefined;

    expect(row).toBeUndefined();

    effective = listMonthlyBudgetCategories("2026-05").find(
      (budgetRow) => budgetRow.categoryId === einkauf.id,
    );

    expect(effective?.defaultBudgetAmountCents).toBe(17500);
    expect(effective?.monthOverrideAmountCents).toBeNull();
    expect(effective?.budgetAmountCents).toBe(17500);
  });

  it("rejects invalid month input", () => {
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

    expect(() => setMonthlyCategoryBudget("2026-5", einkauf.id, "20.00")).toThrow(
      "Monat muss im Format YYYY-MM vorliegen.",
    );
  });

  it("blocks monthly budget overrides for closed months", () => {
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

    db.prepare(
      `
        INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
        VALUES ('2026-05', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    ).run();

    expect(() => setMonthlyCategoryBudget("2026-05", einkauf.id, "20.00")).toThrow(
      "Monat ist abgeschlossen und kann nicht bearbeitet werden.",
    );
  });

  it("lists editable global defaults separately from month data", () => {
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

    setCategoryDefaultBudget(einkauf.id, "250.00");

    const defaults = listCategoryBudgetDefaults();
    const einkaufRow = defaults.find((row) => row.categoryId === einkauf.id);
    const freizeitRow = defaults.find((row) => row.categoryName === "Freizeit");

    expect(einkaufRow?.defaultBudgetAmountCents).toBe(25000);
    expect(einkaufRow?.monthlyOverrideCount).toBe(0);
    expect(freizeitRow?.defaultBudgetAmountCents).toBe(8000);
    expect(freizeitRow?.monthlyOverrideCount).toBe(1);
  });

  it("keeps an inactive transaction-only category visible in its closed month", () => {
    const parkhaus = db
      .prepare("SELECT id FROM categories WHERE name = 'Parkhaus' LIMIT 1")
      .get() as { id: number };
    const account = db
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse' LIMIT 1")
      .get() as { id: number };

    db.prepare(
      `
        UPDATE categories
        SET is_active = 0,
            default_budget_amount_cents = NULL
        WHERE id = ?
      `,
    ).run(parkhaus.id);
    db.prepare("DELETE FROM monthly_category_budgets WHERE category_id = ?").run(parkhaus.id);
    db.prepare(
      `
        INSERT INTO transactions (
          account_id, transaction_type, booking_date, effective_month_key,
          amount_cents, description, source_type, category_id
        )
        VALUES (?, 'expense', '2099-07-10', '2099-07', -1500,
                'FIN-124 historisches Parken', 'manual', ?)
      `,
    ).run(account.id, parkhaus.id);
    db.prepare(
      `
        INSERT INTO monthly_statuses (month_key, status, closed_at, updated_at)
        VALUES ('2099-07', 'closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    ).run();

    expect(
      listMonthlyBudgetCategories("2099-07").find(
        (category) => category.categoryId === parkhaus.id,
      ),
    ).toMatchObject({
      isCategoryActive: false,
      spentAmountCents: 1500,
    });
  });
});
