import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");
type TransactionsModule = typeof import("@/src/transactions/repository");

let dbClient: DbClientModule;
let transactions: TransactionsModule;

const PREFIX = "TEST-FIN-007-";

function cleanupTestTransactions(): void {
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

    const stored = dbClient
      .getDb()
      .prepare(
        "SELECT effective_month_key AS effectiveMonthKey FROM transactions WHERE description = ? LIMIT 1",
      )
      .get(`${PREFIX}ExpenseCategory`) as { effectiveMonthKey: string } | undefined;

    expect(stored?.effectiveMonthKey).toBe("2026-05");
  });

  it("stores explicit target month independent from booking date", () => {
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
      effectiveMonthKey: "2026-06",
      description: `${PREFIX}ExplicitTargetMonth`,
      transactionType: "expense",
      amountInput: "10,00",
      accountId,
      destinationAccountId: null,
      categoryId,
      specialBudgetId: null,
    });

    const stored = dbClient
      .getDb()
      .prepare(
        "SELECT booking_date AS bookingDate, effective_month_key AS effectiveMonthKey FROM transactions WHERE description = ? LIMIT 1",
      )
      .get(`${PREFIX}ExplicitTargetMonth`) as
      | { bookingDate: string; effectiveMonthKey: string }
      | undefined;

    expect(stored?.bookingDate).toBe("2026-05-22");
    expect(stored?.effectiveMonthKey).toBe("2026-06");
  });

  it("rejects invalid target month format", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const categoryId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as { id: number }).id;

    expect(() =>
      transactions.createManualTransaction({
        bookingDate: "2026-05-22",
        effectiveMonthKey: "2026/05",
        description: `${PREFIX}InvalidTargetMonth`,
        transactionType: "expense",
        amountInput: "10,00",
        accountId,
        destinationAccountId: null,
        categoryId,
        specialBudgetId: null,
      }),
    ).toThrow("Zielmonat muss im Format YYYY-MM vorliegen.");
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

  it("reassigns expense transactions inside the selected month for manual and imported rows", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const einkaufId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as { id: number }).id;
    const freizeitId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Freizeit'")
      .get() as { id: number }).id;
    const specialBudgetId = ensureSpecialBudget("2026-05");

    transactions.createManualTransaction({
      bookingDate: "2026-05-08",
      description: `${PREFIX}ReassignManual`,
      transactionType: "expense",
      amountInput: "18,50",
      accountId,
      destinationAccountId: null,
      categoryId: einkaufId,
      specialBudgetId: null,
    });

    const importedInsert = dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id
          )
          VALUES (?, 'expense', '2026-05-09', '2026-05', -990, 'EUR', ?, 'import', NULL, NULL)
        `,
      )
      .run(accountId, `${PREFIX}ReassignImport`);

    const manual = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}ReassignManual`);

    expect(manual).toBeDefined();

    transactions.updateExpenseAssignmentForMonth(manual!.id, "2026-05", {
      categoryId: null,
      specialBudgetId,
    });

    transactions.updateExpenseAssignmentForMonth(Number(importedInsert.lastInsertRowid), "2026-05", {
      categoryId: freizeitId,
      specialBudgetId: null,
    });

    const reassignedManual = dbClient
      .getDb()
      .prepare(
        `
          SELECT category_id AS categoryId, special_budget_id AS specialBudgetId
          FROM transactions
          WHERE id = ?
        `,
      )
      .get(manual!.id) as { categoryId: number | null; specialBudgetId: number | null };

    const reassignedImport = dbClient
      .getDb()
      .prepare(
        `
          SELECT category_id AS categoryId, special_budget_id AS specialBudgetId
          FROM transactions
          WHERE id = ?
        `,
      )
      .get(Number(importedInsert.lastInsertRowid)) as {
      categoryId: number | null;
      specialBudgetId: number | null;
    };

    expect(reassignedManual.categoryId).toBeNull();
    expect(reassignedManual.specialBudgetId).toBe(specialBudgetId);
    expect(reassignedImport.categoryId).toBe(freizeitId);
    expect(reassignedImport.specialBudgetId).toBeNull();
  });

  it("blocks invalid month-context assignment changes", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const einkaufId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as { id: number }).id;
    const specialBudgetMayId = ensureSpecialBudget("2026-05");
    const specialBudgetJuneId = ensureSpecialBudget("2026-06");

    transactions.createManualTransaction({
      bookingDate: "2026-05-11",
      description: `${PREFIX}InvalidMonthContext`,
      transactionType: "expense",
      amountInput: "11,00",
      accountId,
      destinationAccountId: null,
      categoryId: einkaufId,
      specialBudgetId: null,
    });

    const expense = transactions
      .listManualTransactions()
      .find((row) => row.description === `${PREFIX}InvalidMonthContext`);

    expect(expense).toBeDefined();

    expect(() =>
      transactions.updateExpenseAssignmentForMonth(expense!.id, "2026-05", {
        categoryId: einkaufId,
        specialBudgetId: specialBudgetMayId,
      }),
    ).toThrow("Ausgabe braucht genau eine Zuordnung: Kategorie oder Sonderbudget.");

    expect(() =>
      transactions.updateExpenseAssignmentForMonth(expense!.id, "2026-05", {
        categoryId: null,
        specialBudgetId: specialBudgetJuneId,
      }),
    ).toThrow("Sonderbudget muss im gleichen Monat wie die Ausgabe aktiv sein.");

    const incomeInsert = dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id
          )
          VALUES (?, 'income', '2026-05-12', '2026-05', 5000, 'EUR', ?, 'import', NULL, NULL)
        `,
      )
      .run(accountId, `${PREFIX}IncomeReadonly`);

    expect(() =>
      transactions.updateExpenseAssignmentForMonth(Number(incomeInsert.lastInsertRowid), "2026-05", {
        categoryId: einkaufId,
        specialBudgetId: null,
      }),
    ).toThrow("Nur Ausgaben koennen direkt zugeordnet werden.");

    expect(() =>
      transactions.updateExpenseAssignmentForMonth(expense!.id, "2026-06", {
        categoryId: einkaufId,
        specialBudgetId: null,
      }),
    ).toThrow("Buchung passt nicht zum ausgewaehlten Monat.");
  });

  it("does not allow already assigned imported expenses to become open again", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const einkaufId = (dbClient
      .getDb()
      .prepare("SELECT id FROM categories WHERE name = 'Einkauf'")
      .get() as { id: number }).id;

    const importedInsert = dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id
          )
          VALUES (?, 'expense', '2026-05-14', '2026-05', -1599, 'EUR', ?, 'import', NULL, NULL)
        `,
      )
      .run(accountId, `${PREFIX}AssignedImportMustStayAssigned`);

    const importedId = Number(importedInsert.lastInsertRowid);

    transactions.updateExpenseAssignmentForMonth(importedId, "2026-05", {
      categoryId: einkaufId,
      specialBudgetId: null,
    });

    expect(() =>
      transactions.updateExpenseAssignmentForMonth(importedId, "2026-05", {
        categoryId: null,
        specialBudgetId: null,
      }),
    ).toThrow("Ausgabe braucht genau eine Zuordnung: Kategorie oder Sonderbudget.");
  });

  it("deletes imported transactions only inside the selected month", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;

    const importedMay = dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id
          )
          VALUES (?, 'expense', '2026-05-18', '2026-05', -1099, 'EUR', ?, 'import', NULL, NULL)
        `,
      )
      .run(accountId, `${PREFIX}DeleteImportedMay`);

    const importedJune = dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id
          )
          VALUES (?, 'expense', '2026-06-18', '2026-06', -1299, 'EUR', ?, 'import', NULL, NULL)
        `,
      )
      .run(accountId, `${PREFIX}DeleteImportedJune`);

    const manual = dbClient
      .getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            transaction_type,
            booking_date,
            effective_month_key,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id
          )
          VALUES (?, 'income', '2026-05-19', '2026-05', 1399, 'EUR', ?, 'manual', NULL, NULL)
        `,
      )
      .run(accountId, `${PREFIX}DeleteImportedManualGuard`);

    const mayId = Number(importedMay.lastInsertRowid);
    const juneId = Number(importedJune.lastInsertRowid);
    const manualId = Number(manual.lastInsertRowid);

    expect(() =>
      transactions.deleteImportedTransactionForMonth(juneId, "2026-05"),
    ).toThrow("Import-Buchung wurde nicht gefunden.");

    expect(() =>
      transactions.deleteImportedTransactionForMonth(manualId, "2026-05"),
    ).toThrow("Import-Buchung wurde nicht gefunden.");

    transactions.deleteImportedTransactionForMonth(mayId, "2026-05");

    const remaining = dbClient
      .getDb()
      .prepare(
        `
          SELECT description
          FROM transactions
          WHERE description LIKE ?
          ORDER BY description ASC
        `,
      )
      .all(`${PREFIX}DeleteImported%`) as Array<{ description: string }>;

    expect(remaining).toEqual([
      { description: `${PREFIX}DeleteImportedJune` },
      { description: `${PREFIX}DeleteImportedManualGuard` },
    ]);
  });

  it("validates special budget month against explicit target month", () => {
    cleanupTestTransactions();

    const accountId = (dbClient
      .getDb()
      .prepare("SELECT id FROM accounts WHERE name = 'Sparkasse'")
      .get() as { id: number }).id;
    const specialBudgetMayId = ensureSpecialBudget("2026-05");
    const specialBudgetJuneId = ensureSpecialBudget("2026-06");

    expect(() =>
      transactions.createManualTransaction({
        bookingDate: "2026-05-15",
        effectiveMonthKey: "2026-06",
        description: `${PREFIX}SpecialBudgetMismatch`,
        transactionType: "expense",
        amountInput: "15,00",
        accountId,
        destinationAccountId: null,
        categoryId: null,
        specialBudgetId: specialBudgetMayId,
      }),
    ).toThrow("Sonderbudget muss im gleichen Monat wie die Ausgabe aktiv sein.");

    transactions.createManualTransaction({
      bookingDate: "2026-05-15",
      effectiveMonthKey: "2026-06",
      description: `${PREFIX}SpecialBudgetMatch`,
      transactionType: "expense",
      amountInput: "15,00",
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId: specialBudgetJuneId,
    });

    const stored = dbClient
      .getDb()
      .prepare(
        "SELECT effective_month_key AS effectiveMonthKey FROM transactions WHERE description = ? LIMIT 1",
      )
      .get(`${PREFIX}SpecialBudgetMatch`) as { effectiveMonthKey: string } | undefined;

    expect(stored?.effectiveMonthKey).toBe("2026-06");
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

  it("supports fixed costs summary as monthly block without transaction assignment", async () => {
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
  });

  it("rejects invalid fixed cost booking day", async () => {
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

    expect(fixedCosts.listFixedCosts().some((row) => row.name === `${PREFIX}InvalidDay`)).toBe(false);
  });
});
