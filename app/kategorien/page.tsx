const CATEGORY_ROWS = [
  { name: "Einkauf", status: "aktiv", budget: "420,00 EUR" },
  { name: "Tanken", status: "aktiv", budget: "160,00 EUR" },
  { name: "Freizeit", status: "aktiv", budget: "180,00 EUR" },
  { name: "Kleidung", status: "aktiv", budget: "90,00 EUR" },
] as const;

export default function CategoriesPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kategorien</p>
        <h2 className="text-lg font-semibold text-slate-900">Feste Kategorien</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Kategorie</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Monatsziel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CATEGORY_ROWS.map((row) => (
              <tr key={row.name}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                <td className="px-3 py-2 text-slate-700">{row.status}</td>
                <td className="px-3 py-2 text-slate-700">{row.budget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
