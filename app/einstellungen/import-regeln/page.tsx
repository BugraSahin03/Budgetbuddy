import Link from "next/link";

import {
  createImportRuleSettingsAction,
  updateImportRuleSettingsAction,
} from "@/app/einstellungen/actions";
import { listImportRules } from "@/src/import-rules/repository";

export const dynamic = "force-dynamic";

type ImportRulesPageProps = {
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

function matchFieldLabel(value: string): string {
  if (value === "description") {
    return "Beschreibung";
  }

  if (value === "counterparty") {
    return "Gegenpartei";
  }

  return "Beschreibung + Gegenpartei";
}

export default async function ImportRulesPage({ searchParams }: ImportRulesPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const rules = listImportRules().filter((rule) => rule.targetType === "transfer_cash");
  const activeRuleCount = rules.filter((rule) => rule.isActive).length;

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
            <p className="month-eyebrow">Import-Erkennung</p>
            <h2 className="month-hero-title mt-2">Kontrollmuster</h2>
            <p className="month-hero-copy mt-4">
              Pflege schlanke Suchmuster für Import-Kontrollen, zum Beispiel den N26-Fixkostenblock.
              Import-Aliasse bleiben separat und ändern nur Anzeigenamen.
            </p>
          </div>
          <div className="month-stat-card month-stat-card-calm min-w-64">
            <p className="month-stat-label">Aktive Muster</p>
            <p className="month-stat-value mt-2">{activeRuleCount}</p>
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
          <p className="month-eyebrow">Neues Kontrollmuster</p>
          <h3 className="month-section-title mt-1">Muster anlegen</h3>
        </header>

        <form action={createImportRuleSettingsAction} className="grid gap-3 lg:grid-cols-2 xl:grid-cols-10">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-3">
            Name
            <input
              name="name"
              required
              maxLength={80}
              placeholder="z. B. N26 Sammeltransfer Kontrolle"
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-3">
            Suchmuster
            <input
              name="pattern"
              required
              maxLength={120}
              placeholder="z. B. N26-Fix."
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-2">
            Suchfeld
            <select name="matchField" defaultValue="combined" className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]">
              <option value="combined">Beschreibung + Gegenpartei</option>
              <option value="description">Beschreibung</option>
              <option value="counterparty">Gegenpartei</option>
            </select>
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-2">
            Priorität
            <input
              name="priority"
              type="number"
              min={1}
              max={999}
              defaultValue={100}
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <label className="flex items-center gap-2 rounded-[1rem] border border-[color:var(--month-line)] bg-white/70 px-4 py-3 text-sm font-semibold text-[color:var(--month-ink)] xl:col-span-2 xl:self-end">
            <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
            Aktiv
          </label>

          <button type="submit" className="rounded-[1rem] bg-[#061b46] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f4c6d] xl:col-span-2 xl:self-end">
            Muster anlegen
          </button>
        </form>

        <div className="month-chip month-chip-accent w-fit">
          Beispiel: N26-Fix. {"->"} N26-Sammeltransfer als Fixkosten-Kontrolle
        </div>
      </section>

      <section className="month-section-panel space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Musterliste</p>
            <h3 className="month-section-title mt-1">Bestehende Kontrollmuster</h3>
          </div>
          <span className="month-chip month-chip-neutral w-fit">{rules.length} Einträge</span>
        </header>

        {rules.length === 0 ? (
          <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/75 px-4 py-6 text-sm text-[color:var(--month-ink-soft)]">
            Noch keine Kontrollmuster vorhanden.
          </p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule.id} className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                      Kontrollmuster · {matchFieldLabel(rule.matchField)}
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-[color:var(--month-ink)]">{rule.name}</h4>
                  </div>
                  <span className={`month-chip w-fit ${rule.isActive ? "month-chip-accent" : "month-chip-neutral"}`}>
                    {rule.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>

                <form action={updateImportRuleSettingsAction} className="grid gap-3 lg:grid-cols-2 xl:grid-cols-10">
                  <input type="hidden" name="ruleId" value={rule.id} />

                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-3">
                    Name
                    <input name="name" defaultValue={rule.name} required maxLength={80} className="rounded-[1rem] border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]" />
                  </label>

                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-3">
                    Suchmuster
                    <input name="pattern" defaultValue={rule.pattern} required maxLength={120} className="rounded-[1rem] border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]" />
                  </label>

                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-2">
                    Suchfeld
                    <select name="matchField" defaultValue={rule.matchField} className="rounded-[1rem] border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]">
                      <option value="combined">Beschreibung + Gegenpartei</option>
                      <option value="description">Beschreibung</option>
                      <option value="counterparty">Gegenpartei</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-2">
                    Priorität
                    <input name="priority" type="number" min={1} max={999} defaultValue={rule.priority} className="rounded-[1rem] border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]" />
                  </label>

                  <label className="flex items-center gap-2 rounded-[1rem] border border-[color:var(--month-line)] bg-white/70 px-4 py-3 text-sm font-semibold text-[color:var(--month-ink)] xl:col-span-2 xl:self-end">
                    <input type="checkbox" name="isActive" defaultChecked={rule.isActive} className="h-4 w-4" />
                    Aktiv
                  </label>

                  <button type="submit" className="rounded-[1rem] border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 xl:col-span-2 xl:self-end">
                    Muster speichern
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
