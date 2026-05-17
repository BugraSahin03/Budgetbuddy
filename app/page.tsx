const KPI_CARDS = [
  { label: "Verfuegbar", value: "2.140,00 EUR", tone: "text-slate-900" },
  { label: "Fixkosten geplant", value: "780,00 EUR", tone: "text-slate-900" },
  { label: "Offen zugeordnet", value: "2", tone: "text-amber-700" },
  { label: "Bargeldbestand", value: "90,00 EUR", tone: "text-slate-900" },
] as const;

const BUDGET_ROWS = [
  { category: "Einkauf", budget: "420,00 EUR", actual: "368,40 EUR", rest: "51,60 EUR", status: "Im Rahmen" },
  { category: "Tanken", budget: "160,00 EUR", actual: "141,20 EUR", rest: "18,80 EUR", status: "Im Rahmen" },
  { category: "Freizeit", budget: "180,00 EUR", actual: "196,00 EUR", rest: "-16,00 EUR", status: "Ueber Budget" },
  { category: "Oeffis", budget: "90,00 EUR", actual: "62,00 EUR", rest: "28,00 EUR", status: "Im Rahmen" },
] as const;

const RECENT_TRANSACTIONS = [
  { date: "27.04.2026", text: "REWE Markt", account: "Sparkasse", amount: "-44,20 EUR", type: "Ausgabe" },
  { date: "26.04.2026", text: "Bargeld Transfer", account: "Sparkasse -> Bargeld", amount: "-50,00 EUR", type: "Transfer" },
  { date: "25.04.2026", text: "Doener", account: "Bargeld", amount: "-9,00 EUR", type: "Ausgabe" },
  { date: "24.04.2026", text: "Fitness Studio", account: "Sparkasse", amount: "-34,90 EUR", type: "Fixkosten" },
] as const;

function statusTone(status: string): string {
  return status === "Ueber Budget"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function transactionTone(type: string): string {
  if (type === "Transfer") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (type === "Fixkosten") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Warnbereich</p>
        <h2 className="mt-2 text-base font-semibold text-red-900">Budgetueberschreitung in Freizeit</h2>
        <p className="mt-1 text-sm text-red-800">
          Die Kategorie Freizeit liegt 16,00 EUR ueber dem Monatswert. Bitte pruefen, ob Umbuchung oder Sonderbudget noetig ist.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kategoriebudget</p>
            <h2 className="text-lg font-semibold text-slate-900">Monatsuebersicht</h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            1 Warnung aktiv
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
              {BUDGET_ROWS.map((row) => (
                <tr key={row.category} className="text-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.category}</td>
                  <td className="px-3 py-2">{row.budget}</td>
                  <td className="px-3 py-2">{row.actual}</td>
                  <td className="px-3 py-2">{row.rest}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(row.status)}`}>
                      {row.status}
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Transaktionen</p>
          <h2 className="text-lg font-semibold text-slate-900">Letzte Buchungen</h2>
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
              {RECENT_TRANSACTIONS.map((transaction) => (
                <tr key={`${transaction.date}-${transaction.text}`}>
                  <td className="px-3 py-2 text-slate-600">{transaction.date}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{transaction.text}</td>
                  <td className="px-3 py-2 text-slate-600">{transaction.account}</td>
                  <td className="px-3 py-2 text-slate-900">{transaction.amount}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${transactionTone(transaction.type)}`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
