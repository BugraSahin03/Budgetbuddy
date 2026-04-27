const PLACEHOLDER_ROWS = [
  { datum: "27.04.2026", text: "REWE Markt", konto: "Sparkasse", betrag: "-44,20 EUR", status: "Zuordnen" },
  { datum: "26.04.2026", text: "Bargeld Transfer", konto: "Sparkasse -> Bargeld", betrag: "-50,00 EUR", status: "Transfer" },
  { datum: "25.04.2026", text: "Doener", konto: "Bargeld", betrag: "-9,00 EUR", status: "Zugeordnet" },
] as const;

export default function TransactionsPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Transaktionen</p>
          <h2 className="text-lg font-semibold text-slate-900">Buchungsliste</h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-600">April 2026</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">2 offen</span>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Datum</th>
              <th className="px-3 py-2 font-semibold">Buchung</th>
              <th className="px-3 py-2 font-semibold">Konto</th>
              <th className="px-3 py-2 font-semibold">Betrag</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PLACEHOLDER_ROWS.map((row) => (
              <tr key={`${row.datum}-${row.text}`}>
                <td className="px-3 py-2 text-slate-600">{row.datum}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{row.text}</td>
                <td className="px-3 py-2 text-slate-600">{row.konto}</td>
                <td className="px-3 py-2 text-slate-900">{row.betrag}</td>
                <td className="px-3 py-2 text-slate-700">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
