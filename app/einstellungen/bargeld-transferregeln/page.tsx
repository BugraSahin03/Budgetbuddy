import Link from "next/link";

import {
  createCashTransferRuleSettingsAction,
  deleteCashTransferRuleSettingsAction,
  updateCashTransferRuleSettingsAction,
} from "@/app/einstellungen/actions";
import { isCashTransferRule } from "@/src/import-rules/classification";
import { listImportRules } from "@/src/import-rules/repository";

export const dynamic = "force-dynamic";

type CashTransferRulesPageProps = {
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

export default async function CashTransferRulesPage({
  searchParams,
}: CashTransferRulesPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const isEditing = toSingleParam(params.edit) === "1";
  const rules = listImportRules().filter(isCashTransferRule);
  const activeRuleCount = rules.filter((rule) => rule.isActive).length;

  return (
    <section className="month-page-shell space-y-5">
      <section className="month-hero-panel relative overflow-hidden">
        <span className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
        <span className="month-hero-orb month-hero-orb-right" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/einstellungen"
              aria-label="Zurück zu Einstellungen"
              className="month-chip month-chip-neutral mb-4 w-fit text-lg"
            >
              &larr;
            </Link>
            <p className="month-eyebrow">Import-Erkennung</p>
            <h2 className="month-hero-title mt-2">Bargeld- und Transferregeln</h2>
            <p className="month-hero-copy mt-4">
              Regeln, mit denen importierte Buchungen als Bargeldabhebung oder Transfer erkannt
              werden. Hier steuerst du, welche Muster den Vorschlag „Transfer -&gt; Bargeld“
              auslösen.
            </p>
          </div>
          <div className="month-stat-card month-stat-card-calm min-w-64">
            <p className="month-stat-label">Aktive Regeln</p>
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
          <p className="month-eyebrow">Neue Bargeld-/Transferregel</p>
          <h3 className="month-section-title mt-1">Regel anlegen</h3>
        </header>

        <form
          action={createCashTransferRuleSettingsAction}
          className="grid gap-3 lg:grid-cols-2 xl:grid-cols-10"
        >
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-3">
            Name
            <input
              name="name"
              required
              maxLength={80}
              placeholder="z. B. Geldautomat Sparkasse"
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-3">
            Suchmuster
            <input
              name="pattern"
              required
              maxLength={120}
              placeholder="z. B. BARGELDAUSZAHLUNG"
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)] xl:col-span-2">
            Suchfeld
            <select
              name="matchField"
              defaultValue="combined"
              className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/90 px-4 py-3 text-sm normal-case tracking-normal text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
            >
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

          <button
            type="submit"
            className="rounded-[1rem] bg-[#061b46] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f4c6d] xl:col-span-2 xl:self-end"
          >
            Regel anlegen
          </button>
        </form>

        <div className="month-chip month-chip-accent w-fit">
          Zieltyp: Bargeld-Transfer. Keine Fixkosten-Kontrollregel.
        </div>
      </section>

      <section className="month-section-panel space-y-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Regelliste</p>
            <h3 className="month-section-title mt-1">Bestehende Bargeld- und Transferregeln</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={
                isEditing
                  ? "/einstellungen/bargeld-transferregeln"
                  : "/einstellungen/bargeld-transferregeln?edit=1"
              }
              aria-label={isEditing ? "Bearbeitungsmodus beenden" : "Bearbeitungsmodus starten"}
              title={isEditing ? "Fertig" : "Editieren"}
              className="budget-icon-action"
            >
              {isEditing ? "✓" : "✎"}
            </Link>
          </div>
        </header>

        {rules.length === 0 ? (
          <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/75 px-4 py-6 text-sm text-[color:var(--month-ink-soft)]">
            Noch keine Bargeld- oder Transferregeln vorhanden.
          </p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                      Bargeld-Transfer · {matchFieldLabel(rule.matchField)}
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-[color:var(--month-ink)]">
                      {rule.name}
                    </h4>
                  </div>
                  <span className={`month-chip w-fit ${rule.isActive ? "month-chip-accent" : "month-chip-neutral"}`}>
                    {rule.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>

                {isEditing ? (
                  <>
                    <form
                      action={updateCashTransferRuleSettingsAction}
                      className="grid gap-3 lg:grid-cols-2 xl:grid-cols-10"
                    >
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

                      <button
                        type="submit"
                        className="rounded-[1rem] border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 xl:col-span-2 xl:self-end"
                      >
                        Regel speichern
                      </button>
                    </form>

                    <div className="mt-4 rounded-[1.2rem] border border-red-100 bg-red-50/70 p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">
                            Gefahr-Aktion
                          </p>
                          <p className="mt-1 text-sm font-semibold text-red-900">
                            Regel dauerhaft löschen
                          </p>
                          <p className="mt-1 text-xs text-red-700">
                            Bereits importierte Buchungen bleiben unverändert. Die Regel löst künftig
                            keine Importvorschläge mehr aus.
                          </p>
                        </div>

                        <form
                          action={deleteCashTransferRuleSettingsAction}
                          className="flex flex-col gap-2 md:min-w-72"
                        >
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <label className="flex items-center gap-2 rounded-[0.95rem] border border-red-200 bg-white/80 px-3 py-2 text-xs font-semibold text-red-800">
                            <input
                              type="checkbox"
                              name="confirmDelete"
                              required
                              className="h-4 w-4"
                            />
                            Löschen bestätigen
                          </label>
                          <button
                            type="submit"
                            className="rounded-[0.95rem] border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                          >
                            Regel löschen
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                ) : (
                  <dl className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/70 px-4 py-3">
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                        Suchmuster
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-[color:var(--month-ink)]">
                        {rule.pattern}
                      </dd>
                    </div>
                    <div className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/70 px-4 py-3">
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                        Suchfeld
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-[color:var(--month-ink)]">
                        {matchFieldLabel(rule.matchField)}
                      </dd>
                    </div>
                    <div className="rounded-[1rem] border border-[color:var(--month-line)] bg-white/70 px-4 py-3">
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                        Priorität
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-[color:var(--month-ink)]">
                        {rule.priority}
                      </dd>
                    </div>
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
