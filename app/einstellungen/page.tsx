const SETTINGS_BLOCKS = [
  {
    title: "Datenhaltung",
    text: "SQLite bleibt die lokale Quelle. Backup-Strategie folgt mit FIN-016.",
  },
  {
    title: "Importprofil",
    text: "Sparkassen-CSV ist fuer den MVP priorisiert. N26-Import bleibt ausserhalb des Starts.",
  },
  {
    title: "Warnlogik",
    text: "Budgetueberschreitungen bleiben Hinweis und sperren keine Buchung.",
  },
] as const;

export default function SettingsPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Einstellungen</p>
        <h2 className="text-lg font-semibold text-slate-900">System und Regeln</h2>
      </header>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_BLOCKS.map((item) => (
          <li key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-700">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
