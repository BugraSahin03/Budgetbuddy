import Link from "next/link";

import {
  buildDashboardKpis,
  categoryStatusLabel,
  categoryStatusTone,
  countOverBudgetWarnings,
  formatEuro,
  specialBudgetStatusLabel,
  specialBudgetStatusTone,
} from "@/src/dashboard/ui";
import { getMonthDetail } from "@/src/months/repository";

export const dynamic = "force-dynamic";

type MonthDetailPageProps = {
  params: Promise<{ monthKey: string }>;
};

function transactionTypeTone(type: string): string {
  if (type === "transfer") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (type === "income" || type === "refund") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function transactionTypeLabel(type: string): string {
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

function assignmentLabel(row: {
  transactionType: string;
  categoryName: string | null;
  specialBudgetName: string | null;
}): string {
  if (row.transactionType === "expense") {
    return row.categoryName ?? row.specialBudgetName ?? "Offen";
  }

  if (row.transactionType === "transfer") {
    return "Transfer";
  }

  return "Keine Zuordnung noetig";
}

export default async function MonthDetailPage({ params }: MonthDetailPageProps) {
  const { monthKey } = await params;
  const month = getMonthDetail(monthKey);
  const kpis = buildDashboardKpis(month.dashboard);
  const warningCount = countOverBudgetWarnings(month.dashboard);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Monatsdetail
            </p>
            <h2 className="text-lg font-semibold text-slate-900">{month.label}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Vollstaendige Monatssicht mit KPIs, Budgets, Fixkostenblock und Buchungsliste.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={month.previousMonth.href}
              className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Vorheriger Monat
            </Link>
            {month.nextMonth ? (
              <Link
                href={month.nextMonth.href}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Naechster Monat
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400">
                Naechster Monat
              </span>
            )}
          </div>
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
            Dieser Monat enthaelt mindestens eine klare Budgetwarnung.
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
              {month.dashboard.categoryRows.map((row) => (
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
              {month.dashboard.specialBudgetRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-600">
                    Keine Sonderbudgets fuer diesen Monat vorhanden.
                  </td>
                </tr>
              ) : (
                month.dashboard.specialBudgetRows.map((row) => (
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fixkostenblock</p>
            <h2 className="text-lg font-semibold text-slate-900">Plan und Kontrollhinweis</h2>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
            Ist-Kontrolle: {formatEuro(month.dashboard.totals.actualFixedCostsCents)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Fixkosten (Plan)</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatEuro(month.dashboard.totals.plannedFixedCostsCents)}
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Kontrollsicht</p>
            <p className="mt-2 text-sm text-slate-700">
              {month.dashboard.totals.actualFixedCostsCents > 0
                ? "Es wurden importierte Fixkosten-Kontrolltreffer in diesem Monat erkannt."
                : "Fuer diesen Monat gibt es aktuell keinen importierten Fixkosten-Kontrollhinweis."}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Monatsbuchungen</p>
            <h2 className="text-lg font-semibold text-slate-900">Komplette Buchungsliste</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            Eintraege: {month.transactions.length}
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
                <th className="px-3 py-2 font-semibold">Zuordnung</th>
                <th className="px-3 py-2 font-semibold">Quelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {month.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-sm text-slate-600">
                    Keine Buchungen fuer diesen Monat vorhanden.
                  </td>
                </tr>
              ) : (
                month.transactions.map((transaction) => (
                  <tr key={`${transaction.sourceType}-${transaction.id}`}>
                    <td className="px-3 py-2 text-slate-700">{transaction.bookingDate}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {transaction.description}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {transaction.destinationAccountName
                        ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
                        : transaction.accountName}
                    </td>
                    <td className="px-3 py-2 text-slate-900">{formatEuro(transaction.amountCents)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${transactionTypeTone(transaction.transactionType)}`}>
                        {transactionTypeLabel(transaction.transactionType)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{assignmentLabel(transaction)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {transaction.sourceType === "import"
                        ? `Import${transaction.importRunId ? ` #${transaction.importRunId}` : ""}`
                        : "Manuell"}
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
