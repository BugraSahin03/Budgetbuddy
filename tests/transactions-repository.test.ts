import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type TransactionsModule = typeof import("@/src/transactions/repository");

let dbClient: DbClientModule;
let transactions: TransactionsModule;

const PREFIX = "TEST-FIN-007-";

function cleanupTestTransactions(): void {
  dbClient.getDb().prepare("DELETE FROM transactions WHERE description LIKE ?").run(`${PREFIX}%`);
}

function ensureSpecialBudget(monthKey: string): number {
  const name = `${PREFIX}SB-${monthKey}`;
  const existing = dbClient
    .getDb()
    .prepare("SELECT id FROM special_budgets WHERE name = ? AND month_key = ?")
    .get(name, monthKey) as { id: number } | undefined;

  if (existing) {
    dbClient.getDb().prepare("UPDATE special_budgets SET is_active = 1 WHERE id = ?").run(existing.id);
    return existing.id;
  }

  const result = dbClient
    .getDb()
    .prepare(
      `
        INSERT INTO special_budgets (name, month_key, planned_amount_cents, note, is_active)
        VALUES (?, ?, 10000, 'test', 1)
      `,
    )
    .run(name, monthKey);

  return Number(result.lastInsertRowid);
}

beforeAll(async () => {
  dbClient = await import("@/src/db/client");
  transactions = await import("@/src/transactions/repository");
});

describe("transactions repository", () => {
  it("creates expense with category assignment", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const categoryId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}ExpenseCategory`,
      transactionType: "expense",
      amountInput: "10,50",
      accountId,
      destinationAccountId: null,
      categoryId,
      specialBudgetId: null,
    });

    const created = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}ExpenseCategory`);

    expect(created).toBeDefined();
    expect(created?.transactionType).toBe("expense");
    expect(created?.amountCents).toBe(-1050);
    expect(created?.categoryName).toBe("Einkauf");
  });

  it("rejects expense without exactly one assignment", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;

    expect(() =>
      transactions.createManualTransaction({
        bookingDate: "2026-05-22",
        description: `${PREFIX}InvalidExpense`,
        transactionType: "expense",
        amountInput: "5",
        accountId,
        destinationAccountId: null,
        categoryId: null,
        specialBudgetId: null,
      }),
    ).toThrow("Ausgabe braucht genau eine Zuordnung: Kategorie oder Sonderbudget.");
  });

  it("creates transfer without category assignment", () => {
    cleanupTestTransactions();

    const sourceId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const destinationId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Bargeld'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}Transfer`,
      transactionType: "transfer",
      amountInput: "50",
      accountId: sourceId,
      destinationAccountId: destinationId,
      categoryId: null,
      specialBudgetId: null,
    });

    const created = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}Transfer`);

    expect(created).toBeDefined();
    expect(created?.transactionType).toBe("transfer");
    expect(created?.amountCents).toBe(-5000);
    expect(created?.destinationAccountName).toBe("Bargeld");
  });

  it("supports income and refund as positive entries", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}Income`,
      transactionType: "income",
      amountInput: "1000",
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId: null,
    });

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}Refund`,
      transactionType: "refund",
      amountInput: "12,34",
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId: null,
    });

    const rows = transactions.listManualTransactions();
    const income = rows.find((row) => row.description === `${PREFIX}Income`);
    const refund = rows.find((row) => row.description === `${PREFIX}Refund`);

    expect(income?.amountCents).toBe(100000);
    expect(refund?.amountCents).toBe(1234);
  });

  it("updates and deletes manual transaction", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const specialBudgetId = ensureSpecialBudget("2026-05");

    transactions.createManualTransaction({
      bookingDate: "2026-05-05",
      description: `${PREFIX}EditMe`,
      transactionType: "expense",
      amountInput: "20",
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId,
    });

    const created = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}EditMe`);
    expect(created).toBeDefined();

    if (!created) return;

    transactions.updateManualTransaction(created.id, {
      bookingDate: "2026-05-06",
      description: `${PREFIX}Edited`,
      transactionType: "income",
      amountInput: "30",
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId: null,
    });

    const updated = transactions.listManualTransactions().find((row) => row.id === created.id);
    expect(updated?.description).toBe(`${PREFIX}Edited`);
    expect(updated?.transactionType).toBe("income");
    expect(updated?.amountCents).toBe(3000);

    transactions.deleteManualTransaction(created.id);

    const deleted = transactions.listManualTransactions().find((row) => row.id === created.id);
    expect(deleted).toBeUndefined();
  });

  it("tracks cash balance from transfer-in and cash expense", () => {
    cleanupTestTransactions();

    const sparkasseId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const cashId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Bargeld'")
      .get() as { id: number }).id;
    const categoryId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Freizeit'")
      .get() as { id: number }).id;

    const balanceBefore = transactions.getCashAccountSnapshot().currentBalanceCents;

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}CashWithdrawalTransfer`,
      transactionType: "transfer",
      amountInput: "50",
      accountId: sparkasseId,
      destinationAccountId: cashId,
      categoryId: null,
      specialBudgetId: null,
    });

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}CashExpense`,
      transactionType: "expense",
      amountInput: "12",
      accountId: cashId,
      destinationAccountId: null,
      categoryId,
      specialBudgetId: null,
    });

    const balanceAfter = transactions.getCashAccountSnapshot().currentBalanceCents;
    expect(balanceAfter - balanceBefore).toBe(3800);
  });

  it("stores cash withdrawal transfer without category assignment", () => {
    cleanupTestTransactions();

    const sparkasseId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const cashId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Bargeld'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}NoCategoryTransfer`,
      transactionType: "transfer",
      amountInput: "30",
      accountId: sparkasseId,
      destinationAccountId: cashId,
      categoryId: null,
      specialBudgetId: null,
    });

    const stored = dbClient
      .getDb()
      .prepare(
        "SELECT category_id AS categoryId, special_budget_id AS specialBudgetId, transaction_type AS transactionType FROM transactions WHERE description = ?",
      )
      .get(`${PREFIX}NoCategoryTransfer`) as {
      categoryId: number | null;
      specialBudgetId: number | null;
      transactionType: string;
    };

    expect(stored.transactionType).toBe("transfer");
    expect(stored.categoryId).toBeNull();
    expect(stored.specialBudgetId).toBeNull();
  });
});
