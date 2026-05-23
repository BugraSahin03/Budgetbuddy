import { getDashboardMonthSnapshot } from "@/src/dashboard/repository";
import {
  buildDashboardKpis,
  categoryStatusLabel,
  categoryStatusTone,
  countOverBudgetWarnings,
  formatEuro,
  specialBudgetStatusLabel,
  specialBudgetStatusTone,
} from "@/src/dashboard/ui";
import { listManualTransactions } from "@/src/transactions/repository";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${month}.${year}`;
}

function transactionTypeTone(type: string, isFixedCost: boolean): string {
  if (isFixedCost) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (type === "transfer") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (type === "income" || type === "refund") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function transactionTypeLabel(type: string, isFixedCost: boolean): string {
  if (isFixedCost) {
    return "Fixkosten";
  }

  if (type === "transfer") {
    return "Transfer";
  }

  if (type === "income") {
    return "Einkommen";
  }

  if (type === "refund") {
    return "Rueckerstattung";
  }

  return "Ausgabe";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const selectedMonth = toSingleParam(params.month) ?? new Date().toISOString().slice(0, 7);

  const snapshot = getDashboardMonthSnapshot(selectedMonth);
  const kpis = buildDashboardKpis(snapshot);
  const warningCount = countOverBudgetWarnings(snapshot);

  const monthTransactions = listManualTransactions()
    .filter((row) => row.bookingDate.slice(0, 7) === selectedMonth)
    .slice(0, 18);

  const transferCount = monthTransactions.filter(
    (row) => row.transactionType === "transfer",
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Monatsdashboard
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Uebersicht fuer {formatMonthLabel(snapshot.totals.monthKey)}
            </h2>
          </div>

          <form action="/" method="get" className="flex items-center gap-2">
            <label htmlFor="month" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Monat
            </label>
            <input
              id="month"
              name="month"
              type="month"
              defaultValue={snapshot.totals.monthKey}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Laden
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </section>

      {warningCount > 0 ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Warnbereich</p>
          <h2 className="mt-2 text-base font-semibold text-red-900">
            {warningCount} Budgetueberschreitung(en) aktiv
          </h2>
          <p className="mt-1 text-sm text-red-800">
            Bitte pruefen, ob Umbuchung oder Sonderbudget-Anpassung noetig ist.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kategorien</p>
            <h2 className="text-lg font-semibold text-slate-900">Budget / Ist / Rest</h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Transfers sind hier nicht als Ausgaben enthalten
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Kategorie</th>
                <th className="px-3 py-2 font-semibold">Budget</th>
                <th className="px-3 py-2 font-semibold">Ist</th>
                <th className="px-3 py-2 font-semibold">Rest</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.categoryRows.map((row) => (
                <tr key={row.categoryId} className="text-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.categoryName}</td>
                  <td className="px-3 py-2">
                    {row.budgetAmountCents === null ? "-" : formatEuro(row.budgetAmountCents)}
                  </td>
                  <td className="px-3 py-2">{formatEuro(row.spentAmountCents)}</td>
                  <td className="px-3 py-2">
                    {row.remainingAmountCents === null ? "-" : formatEuro(row.remainingAmountCents)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${categoryStatusTone(row)}`}>
                      {categoryStatusLabel(row)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sonderbudgets</p>
          <h2 className="text-lg font-semibold text-slate-900">Separat vom Kategoriebudget</h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Sonderbudget</th>
                <th className="px-3 py-2 font-semibold">Geplant</th>
                <th className="px-3 py-2 font-semibold">Ist</th>
                <th className="px-3 py-2 font-semibold">Rest</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.specialBudgetRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-600">
                    Keine Sonderbudgets fuer diesen Monat vorhanden.
                  </td>
                </tr>
              ) : (
                snapshot.specialBudgetRows.map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    <td className="px-3 py-2">{formatEuro(row.plannedAmountCents)}</td>
                    <td className="px-3 py-2">{formatEuro(row.actualExpenseCents)}</td>
                    <td className="px-3 py-2">{formatEuro(row.remainingAmountCents)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${specialBudgetStatusTone(row)}`}>
                        {specialBudgetStatusLabel(row)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Monatsbuchungen</p>
            <h2 className="text-lg font-semibold text-slate-900">Fixkosten und Transfers klar markiert</h2>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
            Transfers (separat markiert): {transferCount}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Datum</th>
                <th className="px-3 py-2 font-semibold">Buchung</th>
                <th className="px-3 py-2 font-semibold">Konto</th>
                <th className="px-3 py-2 font-semibold">Betrag</th>
                <th className="px-3 py-2 font-semibold">Typ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-600">
                    Keine manuellen Buchungen im ausgewaehlten Monat.
                  </td>
                </tr>
              ) : (
                monthTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-3 py-2 text-slate-700">{transaction.bookingDate}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{transaction.description}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {transaction.destinationAccountName
                        ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
                        : transaction.accountName}
                    </td>
                    <td className="px-3 py-2 text-slate-900">{formatEuro(transaction.amountCents)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${transactionTypeTone(
                          transaction.transactionType,
                          Boolean(transaction.fixedCostName),
                        )}`}
                      >
                        {transactionTypeLabel(
                          transaction.transactionType,
                          Boolean(transaction.fixedCostName),
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
