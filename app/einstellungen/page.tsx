import Link from "next/link";

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

const SETTINGS_RULE_TABS = [
  {
    href: "/einstellungen/import-aliase",
    eyebrow: "Import-Aliasse",
    title: "Anzeigenamen fuer Importe",
    text: "Pflege globale Aliasregeln wie AMZN -> Amazon, ohne Kategorie, Budget oder Duplikaterkennung zu veraendern.",
    cta: "Import-Aliasse oeffnen",
  },
] as const;

export default function SettingsPage() {
  return (
    <section className="month-page-shell space-y-5">
      <section className="month-hero-panel relative overflow-hidden">
        <span className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
        <span className="month-hero-orb month-hero-orb-right" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <p className="month-eyebrow">Einstellungen</p>
            <h2 className="month-hero-title mt-2">System und globale Regeln</h2>
            <p className="month-hero-copy mt-4">
              Globale Regeln gelten ueber alle Monate hinweg und sind bewusst von Monatsarbeit getrennt.
            </p>
          </div>
          <div className="month-stat-card month-stat-card-calm">
            <p className="month-stat-label">Regelbereiche</p>
            <p className="month-stat-value mt-2">1 aktiv</p>
            <p className="mt-2 text-sm text-[color:var(--month-ink-soft)]">
              Weitere globale Einstellungen koennen hier spaeter als eigene Tabs dazukommen.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_BLOCKS.map((item) => (
          <article key={item.title} className="month-stat-card month-stat-card-default">
            <p className="month-stat-label">Grundlage</p>
            <h3 className="mt-2 text-lg font-semibold text-[color:var(--month-ink)]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--month-ink-soft)]">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="month-section-panel space-y-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Globale Regel-Tabs</p>
            <h3 className="month-section-title mt-1">Persoenliche Einstellungen</h3>
            <p className="month-section-copy mt-2">
              Jeder Bereich bleibt fachlich getrennt, damit Import-Aliasse nicht mit Fixkosten oder Import-Regelvorschlaegen vermischt werden.
            </p>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          {SETTINGS_RULE_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="group rounded-[1.6rem] border border-[color:var(--month-line)] bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--month-line-strong)] hover:shadow-lg"
            >
              <p className="month-eyebrow">{tab.eyebrow}</p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--month-ink)]">{tab.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--month-ink-soft)]">{tab.text}</p>
                </div>
                <span className="rounded-full bg-[#061b46] px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-[#0f4c6d]">
                  Oeffnen
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#0f4c6d]">{tab.cta} {"->"}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
