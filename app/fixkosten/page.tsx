const FIXCOST_ROWS = [
  { name: "Fitness Studio", due: "monatlich", amount: "34,90 EUR", booking: "untermonatlich" },
  { name: "Streaming", due: "monatlich", amount: "12,99 EUR", booking: "01. des Monats" },
  { name: "Haftpflicht", due: "quartalsweise", amount: "28,50 EUR", booking: "01. des Monats" },
] as const;

export default function FixedCostsPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fixkosten</p>
        <h2 className="text-lg font-semibold text-slate-900">Planungsblock</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Intervall</th>
              <th className="px-3 py-2 font-semibold">Betrag</th>
              <th className="px-3 py-2 font-semibold">Abbuchung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FIXCOST_ROWS.map((row) => (
              <tr key={row.name}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                <td className="px-3 py-2 text-slate-700">{row.due}</td>
                <td className="px-3 py-2 text-slate-700">{row.amount}</td>
                <td className="px-3 py-2 text-slate-700">{row.booking}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
