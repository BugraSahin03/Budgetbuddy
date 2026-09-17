import "server-only";

import { getDb } from "@/src/db/client";

export type LifetimeStatsYear = {
  year: string;
  incomeCents: number;
  expenseCents: number;
  savingsCents: number;
};

export type LifetimeStats = {
  totals: {
    incomeCents: number;
    expenseCents: number;
    savingsCents: number;
  };
  years: LifetimeStatsYear[];
};

function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

type LifetimeStatsRow = {
  year: string;
  incomeCents: number | null;
  expenseCents: number | null;
  savingsCents: number | null;
};

export function listLifetimeStats(currentMonthKey = getCurrentMonthKey()): LifetimeStats {
  const rows = getDb()
    .prepare(
      `
        SELECT
          substr(t.month_key, 1, 4) AS year,
          COALESCE(
            SUM(
              CASE
                WHEN t.transaction_type IN ('income', 'refund') THEN t.amount_cents
                WHEN t.transaction_type = 'income_deduction' THEN t.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS incomeCents,
          COALESCE(
            SUM(
              CASE
                WHEN t.transaction_type = 'expense' THEN -t.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS expenseCents,
          COALESCE(
            SUM(
              CASE
                WHEN t.transaction_type = 'expense'
                  AND c.system_key = 'savings'
                THEN -t.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS savingsCents
        FROM budget_effective_entries t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.transaction_type IN ('income', 'refund', 'expense', 'income_deduction')
          AND t.month_key <= ?
        GROUP BY year
        ORDER BY year DESC
      `,
    )
    .all(currentMonthKey) as LifetimeStatsRow[];

  const years = rows.map((row) => ({
    year: row.year,
    incomeCents: row.incomeCents ?? 0,
    expenseCents: row.expenseCents ?? 0,
    savingsCents: row.savingsCents ?? 0,
  }));

  return {
    totals: years.reduce(
      (totals, year) => ({
        incomeCents: totals.incomeCents + year.incomeCents,
        expenseCents: totals.expenseCents + year.expenseCents,
        savingsCents: totals.savingsCents + year.savingsCents,
      }),
      {
        incomeCents: 0,
        expenseCents: 0,
        savingsCents: 0,
      },
    ),
    years,
  };
}
