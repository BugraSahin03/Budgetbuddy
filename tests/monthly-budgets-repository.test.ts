import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const { listMonthlyBudgetCategories, setMonthlyCategoryBudget } = await import(
  "@/src/budgets/repository"
);

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
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-05-12', -1200, 'Kino', 'manual', ?)
      `,
    ).run(account.id, category.id);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          transaction_type,
          booking_date,
          amount_cents,
          description,
          source_type,
          category_id
        )
        VALUES (?, 'expense', '2026-06-02', -2300, 'Konzert', 'manual', ?)
      `,
    ).run(account.id, category.id);

    db.prepare(
      `
        INSERT INTO monthly_category_budgets (
          month_key,
          category_id,
          budget_amount_cents
        )
        VALUES ('2026-05', ?, 10000)
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

  it("lists monthly budgets for the selected month", () => {
    const rows = listMonthlyBudgetCategories("2026-05");
    const freizeit = rows.find((row) => row.categoryName === "Freizeit");

    expect(freizeit?.budgetAmountCents).toBe(10000);
    expect(freizeit?.spentAmountCents).toBe(1200);
    expect(freizeit?.remainingAmountCents).toBe(8800);
  });

  it("supports different values per month", () => {
    const may = listMonthlyBudgetCategories("2026-05").find(
      (row) => row.categoryName === "Freizeit",
    );
    const june = listMonthlyBudgetCategories("2026-06").find(
      (row) => row.categoryName === "Freizeit",
    );

    expect(may?.budgetAmountCents).toBe(10000);
    expect(june?.budgetAmountCents).toBe(5000);
  });

  it("can create and clear monthly budget values", () => {
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

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
  });

  it("rejects invalid month input", () => {
    const einkauf = db
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf' LIMIT 1")
      .get() as { id: number };

    expect(() => setMonthlyCategoryBudget("2026-5", einkauf.id, "20.00")).toThrow(
      "Monat muss im Format YYYY-MM vorliegen.",
    );
  });
});
