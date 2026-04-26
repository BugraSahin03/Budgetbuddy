export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">BudgetBuddy</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Private Finanzverwaltung
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          FIN-001 Grundgeruest aktiv: Next.js + TypeScript + SQLite-Vorbereitung.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Kontostand
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0,00 EUR</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Offene Zuordnung
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">0</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Fixkosten geplant
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0,00 EUR</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Naechste Schritte</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>FIN-002: Datenmodell und Migrationen aufbauen</li>
          <li>FIN-003: Navigation fuer Dashboard, Transaktionen und Import</li>
          <li>FIN-004: Feste Kategorien als Stammdaten pflegbar machen</li>
        </ul>
      </section>
    </main>
  );
}
