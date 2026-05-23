import { ImportForm } from "@/app/import/import-form";

export default function ImportPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Import</p>
        <h2 className="text-lg font-semibold text-slate-900">Sparkassen-CSV Vorschau</h2>
        <p className="mt-1 text-sm text-slate-600">
          CSV-Datei einlesen und relevante Felder gemaess FIN-010 vor dem spaeteren Import pruefen.
        </p>
      </header>

      <ImportForm />
    </section>
  );
}
