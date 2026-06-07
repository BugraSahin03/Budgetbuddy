import {
  createImportDisplayAliasAction,
  deleteImportDisplayAliasAction,
  updateImportDisplayAliasAction,
} from "@/app/einstellungen/actions";
import { listImportDisplayAliases } from "@/src/settings/import-display-aliases/repository";

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

type SettingsPageProps = {
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

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const importAliases = listImportDisplayAliases();

  return (
    <section className="space-y-4">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="border-b border-slate-100 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Einstellungen</p>
          <h2 className="text-lg font-semibold text-slate-900">System und globale Regeln</h2>
          <p className="mt-1 text-sm text-slate-600">
            Globale Regeln gelten ueber alle Monate hinweg und sind bewusst von Monatsarbeit getrennt.
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

        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_BLOCKS.map((item) => (
            <li key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="border-b border-slate-100 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Import-Aliasse</p>
          <h3 className="text-base font-semibold text-slate-900">Anzeigenamen fuer importierte Buchungen</h3>
          <p className="mt-1 text-sm text-slate-600">
            Aliasse aendern nur den sichtbaren Namen in Listen. Der originale Banktext bleibt unveraendert gespeichert.
          </p>
          <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
            Diese Aliasse sind getrennt von Import-Regelvorschlaegen und Fixkosten-Kontrollen. Sie setzen keine Kategorie,
            kein Sonderbudget und veraendern keine Duplikaterkennung.
          </p>
        </header>

        <form action={createImportDisplayAliasAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Muster enthaelt
            <input
              name="pattern"
              required
              maxLength={120}
              placeholder="z. B. AMZN"
              className="rounded border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Anzeigename
            <input
              name="displayName"
              required
              maxLength={80}
              placeholder="z. B. Amazon"
              className="rounded border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>

          <button type="submit" className="rounded border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200">
            Alias anlegen
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Beispiel: <span className="font-semibold text-slate-900">AMZN</span> wird als <span className="font-semibold text-slate-900">Amazon</span> angezeigt.
        </div>

        {importAliases.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            Noch keine Import-Aliasse vorhanden.
          </p>
        ) : (
          <ul className="space-y-3">
            {importAliases.map((alias) => (
              <li key={alias.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <form action={updateImportDisplayAliasAction} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
                  <input type="hidden" name="aliasId" value={alias.id} />
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Muster enthaelt
                    <input
                      name="pattern"
                      defaultValue={alias.pattern}
                      required
                      maxLength={120}
                      className="rounded border border-slate-300 px-2 py-1 text-sm normal-case tracking-normal text-slate-900"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Anzeigename
                    <input
                      name="displayName"
                      defaultValue={alias.displayName}
                      required
                      maxLength={80}
                      className="rounded border border-slate-300 px-2 py-1 text-sm normal-case tracking-normal text-slate-900"
                    />
                  </label>
                  <button type="submit" className="rounded border border-sky-300 bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-200">
                    Speichern
                  </button>
                </form>
                <form action={deleteImportDisplayAliasAction} className="mt-2 flex justify-end">
                  <input type="hidden" name="aliasId" value={alias.id} />
                  <button type="submit" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                    Alias loeschen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
