import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type TransactionsModule = typeof import("@/src/transactions/repository");

let dbClient: DbClientModule;
let transactions: TransactionsModule;

const PREFIX = "TEST-FIN-007-";

function tableExists(tableName: string): boolean {
  const row = dbClient
    .getDb()
    .prepare(
      `
        SELECT 1 AS existsFlag
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
        LIMIT 1
      `,
    )
    .get(tableName) as { existsFlag: number } | undefined;

  return row?.existsFlag === 1;
}

function cleanupTestTransactions(): void {
  if (tableExists("fixed_cost_transaction_links")) {
    dbClient
      .getDb()
      .prepare(
        `
          DELETE FROM fixed_cost_transaction_links
          WHERE transaction_id IN (
            SELECT id FROM transactions WHERE description LIKE ?
          )
        `,
      )
      .run(`${PREFIX}%`);
  }
  dbClient.getDb().prepare("DELETE FROM transactions WHERE description LIKE ?").run(`${PREFIX}%`);
  dbClient.getDb().prepare("DELETE FROM fixed_costs WHERE name LIKE ?").run(`${PREFIX}%`);
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

  it("keeps fixed cost marker fields empty because assignment model is deprecated", async () => {
    cleanupTestTransactions();

    const fixedCosts = await import("@/src/fixed-costs/repository");
    fixedCosts.createFixedCost({
      name: `${PREFIX}FixedMarker`,
      plannedAmountInput: "9,99",
      bookingDayOfMonthInput: "",
      paymentNote: "",
      note: "",
    });

    const fixedCostId = fixedCosts
      .listFixedCosts()
      .find((row) => row.name === `${PREFIX}FixedMarker`)?.id;
    expect(fixedCostId).toBeDefined();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const categoryId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Freizeit'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-22",
      description: `${PREFIX}FixedCostLinked`,
      transactionType: "expense",
      amountInput: "9,99",
      accountId,
      destinationAccountId: null,
      categoryId,
      specialBudgetId: null,
    });

    const created = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}FixedCostLinked`);
    expect(created).toBeDefined();

    expect(() => fixedCosts.assignTransactionToFixedCost(created!.id, fixedCostId!, "2026-05")).toThrow(
      "Manuelle Fixkosten-Transaktionszuordnung ist im Monatsblock-Modell deaktiviert.",
    );

    const linked = transactions
      .listManualTransactions()
      .find((row) => row.id === created!.id);

    expect(linked?.fixedCostName).toBeNull();
    expect(linked?.fixedCostEffectiveMonthKey).toBeNull();
  });

  it("supports fixed costs summary without manual wirkt_fuer_monat assignment", async () => {
    cleanupTestTransactions();

    const fixedCosts = await import("@/src/fixed-costs/repository");
    fixedCosts.createFixedCost({
      name: `${PREFIX}Streaming`,
      plannedAmountInput: "12,99",
      bookingDayOfMonthInput: "1",
      paymentNote: "SEPA",
      note: "Monatlich",
    });

    const fixedCostId = fixedCosts
      .listFixedCosts()
      .find((row) => row.name === `${PREFIX}Streaming`)?.id;
    expect(fixedCostId).toBeDefined();

    const summary = fixedCosts.getFixedCostsSummary();
    expect(summary.activeCount).toBeGreaterThanOrEqual(1);
    expect(summary.plannedTotalCents).toBeGreaterThanOrEqual(1299);

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const categoryId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Fitness'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-29",
      description: `${PREFIX}StreamingCharge`,
      transactionType: "expense",
      amountInput: "12,99",
      accountId,
      destinationAccountId: null,
      categoryId,
      specialBudgetId: null,
    });

    const created = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}StreamingCharge`);
    expect(created).toBeDefined();

    expect(() => fixedCosts.assignTransactionToFixedCost(created!.id, fixedCostId!, "2026-06")).toThrow(
      "Manuelle Fixkosten-Transaktionszuordnung ist im Monatsblock-Modell deaktiviert.",
    );

    const assignment = fixedCosts
      .listExpenseTransactionsForFixedCostAssignment()
      .find((row) => row.transactionId === created!.id);
    expect(assignment?.fixedCostId).toBeNull();
    expect(assignment?.effectiveMonthKey).toBeNull();

    expect(() => fixedCosts.unassignTransactionFromFixedCost(created!.id)).toThrow(
      "Manuelle Fixkosten-Transaktionszuordnung ist im Monatsblock-Modell deaktiviert.",
    );
  });

  it("rejects invalid fixed cost booking day and manual assignment attempts", async () => {
    cleanupTestTransactions();

    const fixedCosts = await import("@/src/fixed-costs/repository");

    expect(() =>
      fixedCosts.createFixedCost({
        name: `${PREFIX}InvalidDay`,
        plannedAmountInput: "10",
        bookingDayOfMonthInput: "42",
        paymentNote: "",
        note: "",
      }),
    ).toThrow("Abbuchungstag muss zwischen 1 und 31 liegen.");

    fixedCosts.createFixedCost({
      name: `${PREFIX}Insurance`,
      plannedAmountInput: "45",
      bookingDayOfMonthInput: "",
      paymentNote: "",
      note: "",
    });

    const fixedCostId = fixedCosts
      .listFixedCosts()
      .find((row) => row.name === `${PREFIX}Insurance`)!.id;
    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;

    transactions.createManualTransaction({
      bookingDate: "2026-05-20",
      description: `${PREFIX}IncomeTx`,
      transactionType: "income",
      amountInput: "100",
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId: null,
    });

    const incomeTx = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}IncomeTx`);
    expect(incomeTx).toBeDefined();

    expect(() => fixedCosts.assignTransactionToFixedCost(incomeTx!.id, fixedCostId, "")).toThrow(
      "Manuelle Fixkosten-Transaktionszuordnung ist im Monatsblock-Modell deaktiviert.",
    );
  });
});
