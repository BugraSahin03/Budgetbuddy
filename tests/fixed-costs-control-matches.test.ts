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
  it("lists only persistently stored rule controls, not direct master-data matches", async () => {
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

    const explicitControlTransaction = db.prepare(
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

    const importRules = await import("@/src/import-rules/repository");
    const rule = importRules
      .listActiveImportRules()
      .find((candidate) => candidate.rulePurpose === "fixed_cost_control");
    expect(rule).toBeDefined();
    db.prepare(
      `
        INSERT INTO transaction_fixed_cost_control_matches (
          transaction_id, import_rule_id, rule_name_snapshot,
          rule_pattern_snapshot, rule_match_field_snapshot
        ) VALUES (?, ?, ?, ?, ?)
      `,
    ).run(
      Number(explicitControlTransaction.lastInsertRowid),
      rule!.id,
      rule!.name,
      rule!.pattern,
      rule!.matchField,
    );

    const controls = fixedCosts
      .listFixedCostControlMatches(40)
      .filter((row) => row.description.startsWith(PREFIX));

    expect(controls).toEqual([
      expect.objectContaining({
        controlLabel: "Fixkosten-Kontrolle: Kontrollmuster",
        ruleName: rule!.name,
      }),
    ]);
  });
});
