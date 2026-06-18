import { ImportForm } from "@/app/import/import-form";

type ImportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Import</p>
        <h2 className="text-lg font-semibold text-slate-900">Sparkassen-CSV Vorschau</h2>
        <p className="mt-1 text-sm text-slate-600">
          CSV-Datei einlesen und relevante Felder gemäß FIN-010 vor dem späteren Import prüfen.
        </p>
      </header>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ImportForm />
    </section>
  );
}
