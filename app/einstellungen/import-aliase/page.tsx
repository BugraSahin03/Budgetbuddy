import Link from "next/link";

import {
  createImportDisplayAliasAction,
  deleteImportDisplayAliasAction,
  updateImportDisplayAliasAction,
} from "@/app/einstellungen/actions";
import { listImportDisplayAliases } from "@/src/settings/import-display-aliases/repository";

export const dynamic = "force-dynamic";

type ImportAliasPageProps = {
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

export default async function ImportAliasesPage({ searchParams }: ImportAliasPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const isEditing = toSingleParam(params.edit) === "1";
  const importAliases = listImportDisplayAliases();

  return (
    <section className="month-page-shell space-y-5">
      <section className="month-hero-panel relative overflow-hidden">
        <span className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
        <span className="month-hero-orb month-hero-orb-right" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/einstellungen" aria-label="Zurück zu Einstellungen" className="month-chip month-chip-neutral mb-4 w-fit text-lg">
              &larr;
            </Link>
            <p className="month-eyebrow">Import-Aliasse</p>
            <h2 className="month-hero-title mt-2">Import-Aliasse</h2>
            <p className="month-hero-copy mt-4">
              Aliasse ändern nur den sichtbaren Namen in Listen. Der originale Banktext bleibt unverändert gespeichert.
            </p>
          </div>
          <div className="month-stat-card month-stat-card-calm min-w-64">
            <p className="month-stat-label">Aktive Aliasse</p>
            <p className="month-stat-value mt-2">{importAliases.length}</p>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <section className="month-section-panel space-y-4">
        <header>
          <div>
            <p className="month-eyebrow">Neue Regel</p>
            <h3 className="month-section-title mt-1">Alias anlegen</h3>
          </div>
        </header>

        <form action={createImportDisplayAliasAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
            Muster enthält
            <input
              name="pattern"
              required
              maxLength={120}
              placeholder="z. B. AMZN"
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
            Anzeigename
            <input
              name="displayName"
              required
              maxLength={80}
              placeholder="z. B. Amazon"
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <button type="submit" className="rounded-[1rem] bg-[#061b46] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f4c6d]">
            Alias anlegen
          </button>
        </form>

        <div className="month-chip month-chip-accent w-fit">
          Beispiel: AMZN {"->"} Amazon
        </div>
      </section>

      <section className="month-section-panel space-y-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="month-eyebrow">Aliasliste</p>
            <h3 className="month-section-title mt-1">Bestehende Anzeigenamen</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="month-chip month-chip-neutral w-fit">{importAliases.length} Einträge</span>
            {importAliases.length > 0 && isEditing ? (
              <Link
                href="/einstellungen/import-aliase"
                className="budget-icon-action budget-icon-action-save"
                aria-label="Editiermodus für Import-Aliasse beenden"
                title="Fertig"
              >
                ✓
              </Link>
            ) : null}
            {importAliases.length > 0 && !isEditing ? (
              <Link
                href="/einstellungen/import-aliase?edit=1"
                className="budget-icon-action"
                aria-label="Import-Aliasse bearbeiten"
                title="Bearbeiten"
              >
                ✎
              </Link>
            ) : null}
          </div>
        </header>

        {importAliases.length === 0 ? (
          <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/75 px-4 py-6 text-sm text-[color:var(--month-ink-soft)]">
            Noch keine Import-Aliasse vorhanden.
          </p>
        ) : isEditing ? (
          <ul className="space-y-3" aria-label="Import-Aliasse bearbeiten">
            {importAliases.map((alias) => (
              <li key={alias.id} className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm">
                <form action={updateImportDisplayAliasAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                  <input type="hidden" name="aliasId" value={alias.id} />
                  <input type="hidden" name="returnToEdit" value="1" />
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                    Muster enthält
                    <input
                      name="pattern"
                      defaultValue={alias.pattern}
                      required
                      maxLength={120}
                      className="rounded-[1rem] border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                    Anzeigename
                    <input
                      name="displayName"
                      defaultValue={alias.displayName}
                      required
                      maxLength={80}
                      className="rounded-[1rem] border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
                    />
                  </label>
                  <button type="submit" className="rounded-[1rem] border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100">
                    Speichern
                  </button>
                </form>
                <form action={deleteImportDisplayAliasAction} className="mt-4 flex flex-col gap-2 rounded-[1rem] border border-red-100 bg-red-50/60 px-3 py-3 md:flex-row md:items-center md:justify-between">
                  <input type="hidden" name="aliasId" value={alias.id} />
                  <input type="hidden" name="returnToEdit" value="1" />
                  <label className="flex items-center gap-2 text-xs font-semibold text-red-800">
                    <input name="confirmDelete" type="checkbox" className="h-4 w-4 rounded border-red-200" />
                    Löschen bestätigen
                  </label>
                  <button type="submit" className="w-fit rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100">
                    Alias löschen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3" aria-label="Import-Aliasse">
            {importAliases.map((alias) => (
              <li key={alias.id} className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                      Muster enthält
                    </p>
                    <p className="mt-1 text-base font-black text-[color:var(--month-ink)]">{alias.pattern}</p>
                  </div>
                  <div className="rounded-[1rem] border border-sky-100 bg-sky-50/70 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                      Anzeigename
                    </p>
                    <p className="mt-1 text-base font-black text-sky-950">{alias.displayName}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
