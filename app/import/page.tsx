const IMPORT_STEPS = [
  { step: "Datei waehlen", status: "offen" },
  { step: "Buchungen pruefen", status: "offen" },
  { step: "Duplikate markieren", status: "offen" },
  { step: "Import bestaetigen", status: "offen" },
] as const;

export default function ImportPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Import</p>
        <h2 className="text-lg font-semibold text-slate-900">Sparkassen-Workflow</h2>
        <p className="mt-1 text-sm text-slate-600">
          Vorschau fuer CSV-Einlesung mit klarer Trennung von Ausgabe, Transfer und offenen Zuordnungen.
        </p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {IMPORT_STEPS.map((step) => (
          <li key={step.step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">{step.step}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Status: {step.status}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Hinweis: Unzugeordnete Ausgaben und potenzielle Duplikate werden hier sichtbar hervorgehoben.
      </div>
    </section>
  );
}
