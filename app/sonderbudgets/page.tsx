const SPECIAL_BUDGET_ROWS = [
  { name: "Raspberry Pi", month: "Mai 2026", target: "120,00 EUR", actual: "0,00 EUR", status: "Geplant" },
  { name: "Bali Flug", month: "Juni 2026", target: "450,00 EUR", actual: "0,00 EUR", status: "Geplant" },
] as const;

export default function SpecialBudgetsPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sonderbudgets</p>
        <h2 className="text-lg font-semibold text-slate-900">Monatliche Sonderziele</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Monat</th>
              <th className="px-3 py-2 font-semibold">Geplant</th>
              <th className="px-3 py-2 font-semibold">Ist</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SPECIAL_BUDGET_ROWS.map((row) => (
              <tr key={`${row.name}-${row.month}`}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                <td className="px-3 py-2 text-slate-700">{row.month}</td>
                <td className="px-3 py-2 text-slate-700">{row.target}</td>
                <td className="px-3 py-2 text-slate-700">{row.actual}</td>
                <td className="px-3 py-2 text-slate-700">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
