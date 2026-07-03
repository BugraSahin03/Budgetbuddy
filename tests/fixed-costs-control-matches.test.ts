import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type DbClientModule = typeof import("@/src/db/client");

let dbClient: DbClientModule;

const PREFIX = "TEST-FIN-028-";

function cleanup(): void {
  const db = dbClient.getDb();
  db.prepare("DELETE FROM transactions WHERE description LIKE ?").run(`${PREFIX}%`);
  db.prepare("DELETE FROM fixed_costs WHERE name LIKE ?").run(`${PREFIX}%`);
}

beforeAll(async () => {
  dbClient = await import("@/src/db/client");
});

describe("fixed-cost control matches", () => {
  it("lists N26 and direct debit controls without manual assignment model", async () => {
    cleanup();

    const db = dbClient.getDb();
    const sparkasseId = (
      db.prepare("SELECT id FROM accounts WHERE name = 'Sparkasse' LIMIT 1").get() as { id: number }
    ).id;

    const fixedCosts = await import("@/src/fixed-costs/repository");
    fixedCosts.createFixedCost({
      name: `${PREFIX}Fitness`,
      plannedAmountInput: "34,90",
      bookingDayOfMonthInput: "1",
      paymentNote: `${PREFIX}FITNESS STUDIO`,
      note: "",
    });

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          destination_account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          currency_code,
          description,
          counterparty_name,
          source_type,
          category_id,
          special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-02-01', '2031-02', -4000, 'EUR', ?, 'N26 BANK', 'import', NULL, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}UEBERWEISUNG | N26-Fix. Monatsblock`);

    db.prepare(
      `
        INSERT INTO transactions (
          account_id,
          destination_account_id,
          transaction_type,
          booking_date,
          effective_month_key,
          amount_cents,
          currency_code,
          description,
          counterparty_name,
          source_type,
          category_id,
          special_budget_id
        ) VALUES (?, NULL, 'expense', '2031-02-02', '2031-02', -3490, 'EUR', ?, ?, 'import', NULL, NULL)
      `,
    ).run(sparkasseId, `${PREFIX}LASTSCHRIFT`, `${PREFIX}FITNESS STUDIO`);

    const controls = fixedCosts
      .listFixedCostControlMatches(40)
      .filter((row) => row.description.startsWith(PREFIX));

    expect(
      controls.some(
        (row) => row.controlLabel === "Fixkosten-Kontrolle: Kontrollmuster",
      ),
    ).toBe(true);
    expect(
      controls.some((row) =>
        row.controlLabel.startsWith("Fixkosten-Kontrolle: Direktabbuchung"),
      ),
    ).toBe(true);
  });
});
