import "server-only";

import { getDb } from "@/src/db/client";
import { resolveImportDisplayName } from "@/src/import/display-name";
import { listImportDisplayAliases } from "@/src/settings/import-display-aliases/repository";

export type ImportedTransactionListItem = {
  id: number;
  bookingDate: string;
  description: string;
  displayNameOverride: string | null;
  displayName: string;
  amountCents: number;
  transactionType: "expense" | "income" | "transfer" | "refund";
  sourceAccountName: string;
  destinationAccountName: string | null;
  counterpartyName: string | null;
  categoryName: string | null;
  specialBudgetName: string | null;
  importRunId: number | null;
};

export function listImportedTransactions(): ImportedTransactionListItem[] {
  const aliases = listImportDisplayAliases();
  const rows = getDb()
    .prepare(
      `
        SELECT
          t.id,
          t.booking_date AS bookingDate,
          t.description,
          t.display_name_override AS displayNameOverride,
          t.amount_cents AS amountCents,
          t.transaction_type AS transactionType,
          source.name AS sourceAccountName,
          destination.name AS destinationAccountName,
          t.counterparty_name AS counterpartyName,
          c.name AS categoryName,
          sb.name AS specialBudgetName,
          t.import_run_id AS importRunId
        FROM transactions t
        LEFT JOIN imported_transactions it ON it.transaction_id = t.id
        INNER JOIN accounts source ON source.id = t.account_id
        LEFT JOIN accounts destination ON destination.id = t.destination_account_id
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN special_budgets sb ON sb.id = t.special_budget_id
        WHERE t.source_type = 'import'
        ORDER BY
          t.booking_date DESC,
          CASE
            WHEN it.source_row_index IS NULL THEN t.id
            ELSE COALESCE(
              (
                SELECT MAX(imported_t.id)
                FROM transactions imported_t
                WHERE imported_t.import_run_id = t.import_run_id
                  AND imported_t.booking_date = t.booking_date
              ),
              t.id
            )
          END DESC,
          CASE
            WHEN it.source_row_index IS NULL THEN 0
            ELSE it.source_row_index
          END ASC,
          t.id DESC
      `,
    )
    .all() as Array<Omit<ImportedTransactionListItem, "displayName">>;

  return rows.map((row) => ({
    ...row,
    displayName: resolveImportDisplayName({
      sourceType: "import",
      description: row.description,
      displayNameOverride: row.displayNameOverride,
      counterpartyName: row.counterpartyName,
      aliases,
    }),
  }));
}
