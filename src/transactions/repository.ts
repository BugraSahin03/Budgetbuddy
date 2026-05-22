import "server-only";

import { getDb } from "@/src/db/client";

export type TransactionType = "expense" | "income" | "transfer" | "refund";

export type TransactionListItem = {
  id: number;
  bookingDate: string;
  description: string;
  accountName: string;
  destinationAccountName: string | null;
  transactionType: TransactionType;
  amountCents: number;
  categoryName: string | null;
  specialBudgetName: string | null;
  specialBudgetMonthKey: string | null;
};

export type AccountOption = {
  id: number;
  name: string;
  accountType: "bank" | "cash" | "virtual";
};

export type CategoryOption = {
  id: number;
  name: string;
};

export type SpecialBudgetOption = {
  id: number;
  name: string;
  monthKey: string;
};

export type ManualTransactionInput = {
  bookingDate: string;
  description: string;
  transactionType: TransactionType;
  amountInput: string;
  accountId: number;
  destinationAccountId: number | null;
  categoryId: number | null;
  specialBudgetId: number | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

function toMonthKey(bookingDate: string): string {
  return bookingDate.slice(0, 7);
}

function parseAmountCents(amountInput: string): number {
  const normalized = amountInput.trim();

  if (normalized.length === 0) {
    throw new Error("Betrag ist erforderlich.");
  }

  if (!AMOUNT_PATTERN.test(normalized)) {
    throw new Error("Betrag ist ungueltig formatiert.");
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Betrag muss groesser als 0 sein.");
  }

  const cents = Math.round(parsed * 100);

  if (cents > 99_999_999) {
    throw new Error("Betrag ist zu gross.");
  }

  return cents;
}

function normalizeBookingDate(bookingDate: string): string {
  const normalized = bookingDate.trim();

  if (!DATE_PATTERN.test(normalized)) {
    throw new Error("Datum muss im Format JJJJ-MM-TT vorliegen.");
  }

  return normalized;
}

function normalizeDescription(description: string): string {
  const normalized = description.trim();

  if (normalized.length < 2) {
    throw new Error("Beschreibung muss mindestens 2 Zeichen enthalten.");
  }

  if (normalized.length > 140) {
    throw new Error("Beschreibung darf maximal 140 Zeichen enthalten.");
  }

  return normalized;
}

function ensurePositiveInt(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} ist ungueltig.`);
  }

  return value;
}

function mapError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Transaktion konnte nicht gespeichert werden.");
}

function getAccountById(accountId: number): { id: number; isActive: number } {
  const account = getDb()
    .prepare("SELECT id, is_active AS isActive FROM accounts WHERE id = ?")
    .get(accountId) as { id: number; isActive: number } | undefined;

  if (!account) {
    throw new Error("Konto wurde nicht gefunden.");
  }

  if (account.isActive !== 1) {
    throw new Error("Konto ist deaktiviert.");
  }

  return account;
}

function getActiveCategoryById(categoryId: number): { id: number } {
  const category = getDb()
    .prepare("SELECT id, is_active AS isActive FROM categories WHERE id = ?")
    .get(categoryId) as { id: number; isActive: number } | undefined;

  if (!category) {
    throw new Error("Kategorie wurde nicht gefunden.");
  }

  if (category.isActive !== 1) {
    throw new Error("Kategorie ist deaktiviert und nicht auswaehlbar.");
  }

  return category;
}

function getActiveSpecialBudgetById(
  specialBudgetId: number,
): { id: number; monthKey: string; isActive: number } {
  const specialBudget = getDb()
    .prepare(
      "SELECT id, month_key AS monthKey, is_active AS isActive FROM special_budgets WHERE id = ?",
    )
    .get(specialBudgetId) as
    | { id: number; monthKey: string; isActive: number }
    | undefined;

  if (!specialBudget) {
    throw new Error("Sonderbudget wurde nicht gefunden.");
  }

  if (specialBudget.isActive !== 1) {
    throw new Error("Sonderbudget ist deaktiviert und nicht auswaehlbar.");
  }

  return specialBudget;
}

function resolveSignedAmount(transactionType: TransactionType, absoluteCents: number): number {
  if (transactionType === "expense" || transactionType === "transfer") {
    return -absoluteCents;
  }

  return absoluteCents;
}

function validateAndShapeInput(input: ManualTransactionInput): {
  bookingDate: string;
  description: string;
  transactionType: TransactionType;
  amountCents: number;
  accountId: number;
  destinationAccountId: number | null;
  categoryId: number | null;
  specialBudgetId: number | null;
} {
  const bookingDate = normalizeBookingDate(input.bookingDate);
  const description = normalizeDescription(input.description);
  const transactionType = input.transactionType;
  const accountId = ensurePositiveInt(input.accountId, "Konto");
  const absoluteCents = parseAmountCents(input.amountInput);
  const amountCents = resolveSignedAmount(transactionType, absoluteCents);

  getAccountById(accountId);

  if (transactionType === "transfer") {
    const destinationAccountId = ensurePositiveInt(
      input.destinationAccountId ?? -1,
      "Zielkonto",
    );

    if (destinationAccountId === accountId) {
      throw new Error("Zielkonto muss sich vom Quellkonto unterscheiden.");
    }

    getAccountById(destinationAccountId);

    return {
      bookingDate,
      description,
      transactionType,
      amountCents,
      accountId,
      destinationAccountId,
      categoryId: null,
      specialBudgetId: null,
    };
  }

  if (transactionType === "expense") {
    const hasCategory = Number.isInteger(input.categoryId) && (input.categoryId ?? 0) > 0;
    const hasSpecialBudget =
      Number.isInteger(input.specialBudgetId) && (input.specialBudgetId ?? 0) > 0;

    if ((hasCategory && hasSpecialBudget) || (!hasCategory && !hasSpecialBudget)) {
      throw new Error("Ausgabe braucht genau eine Zuordnung: Kategorie oder Sonderbudget.");
    }

    if (hasCategory) {
      const categoryId = ensurePositiveInt(input.categoryId ?? -1, "Kategorie");
      getActiveCategoryById(categoryId);

      return {
        bookingDate,
        description,
        transactionType,
        amountCents,
        accountId,
        destinationAccountId: null,
        categoryId,
        specialBudgetId: null,
      };
    }

    const specialBudgetId = ensurePositiveInt(input.specialBudgetId ?? -1, "Sonderbudget");
    const specialBudget = getActiveSpecialBudgetById(specialBudgetId);

    if (specialBudget.monthKey !== toMonthKey(bookingDate)) {
      throw new Error("Sonderbudget muss im gleichen Monat wie die Ausgabe aktiv sein.");
    }

    return {
      bookingDate,
      description,
      transactionType,
      amountCents,
      accountId,
      destinationAccountId: null,
      categoryId: null,
      specialBudgetId,
    };
  }

  return {
    bookingDate,
    description,
    transactionType,
    amountCents,
    accountId,
    destinationAccountId: null,
    categoryId: null,
    specialBudgetId: null,
  };
}

export function listManualTransactions(): TransactionListItem[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          t.id,
          t.booking_date AS bookingDate,
          t.description,
          source.name AS accountName,
          destination.name AS destinationAccountName,
          t.transaction_type AS transactionType,
          t.amount_cents AS amountCents,
          c.name AS categoryName,
          sb.name AS specialBudgetName,
          sb.month_key AS specialBudgetMonthKey
        FROM transactions t
        INNER JOIN accounts source ON source.id = t.account_id
        LEFT JOIN accounts destination ON destination.id = t.destination_account_id
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN special_budgets sb ON sb.id = t.special_budget_id
        WHERE t.source_type = 'manual'
        ORDER BY t.booking_date DESC, t.id DESC
      `,
    )
    .all() as TransactionListItem[];

  return rows;
}

export function listActiveAccountOptions(): AccountOption[] {
  return getDb()
    .prepare(
      `
        SELECT
          id,
          name,
          account_type AS accountType
        FROM accounts
        WHERE is_active = 1
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all() as AccountOption[];
}

export function listActiveCategoryOptions(): CategoryOption[] {
  return getDb()
    .prepare(
      `
        SELECT id, name
        FROM categories
        WHERE is_active = 1
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all() as CategoryOption[];
}

export function listActiveSpecialBudgetOptionsForMonth(
  monthKey: string,
): SpecialBudgetOption[] {
  return getDb()
    .prepare(
      `
        SELECT
          id,
          name,
          month_key AS monthKey
        FROM special_budgets
        WHERE is_active = 1
          AND month_key = ?
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all(monthKey) as SpecialBudgetOption[];
}

export function createManualTransaction(input: ManualTransactionInput): void {
  const shaped = validateAndShapeInput(input);

  try {
    getDb()
      .prepare(
        `
          INSERT INTO transactions (
            account_id,
            destination_account_id,
            transaction_type,
            booking_date,
            amount_cents,
            currency_code,
            description,
            source_type,
            category_id,
            special_budget_id,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, 'EUR', ?, 'manual', ?, ?, CURRENT_TIMESTAMP)
        `,
      )
      .run(
        shaped.accountId,
        shaped.destinationAccountId,
        shaped.transactionType,
        shaped.bookingDate,
        shaped.amountCents,
        shaped.description,
        shaped.categoryId,
        shaped.specialBudgetId,
      );
  } catch (error) {
    throw mapError(error);
  }
}

export function updateManualTransaction(transactionId: number, input: ManualTransactionInput): void {
  const shaped = validateAndShapeInput(input);
  const id = ensurePositiveInt(transactionId, "Transaktion");

  try {
    const result = getDb()
      .prepare(
        `
          UPDATE transactions
          SET
            account_id = ?,
            destination_account_id = ?,
            transaction_type = ?,
            booking_date = ?,
            amount_cents = ?,
            description = ?,
            category_id = ?,
            special_budget_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND source_type = 'manual'
        `,
      )
      .run(
        shaped.accountId,
        shaped.destinationAccountId,
        shaped.transactionType,
        shaped.bookingDate,
        shaped.amountCents,
        shaped.description,
        shaped.categoryId,
        shaped.specialBudgetId,
        id,
      );

    if (result.changes === 0) {
      throw new Error("Transaktion wurde nicht gefunden.");
    }
  } catch (error) {
    throw mapError(error);
  }
}

export function deleteManualTransaction(transactionId: number): void {
  const id = ensurePositiveInt(transactionId, "Transaktion");

  const result = getDb()
    .prepare("DELETE FROM transactions WHERE id = ? AND source_type = 'manual'")
    .run(id);

  if (result.changes === 0) {
    throw new Error("Transaktion wurde nicht gefunden.");
  }
}
