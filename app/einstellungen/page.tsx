import Link from "next/link";

const GLOBAL_SETTINGS = [
  {
    href: "/einstellungen/import-aliase",
    title: "Anzeigename fuer Importe",
    text: "Importierte Banktexte lesbarer anzeigen, ohne Originaltext oder Zuordnung zu veraendern.",
    meta: "Import-Aliasse",
  },
] as const;

export default function SettingsPage() {
  return (
    <section className="month-page-shell space-y-5">
      <header className="month-section-panel flex flex-col gap-2">
        <p className="month-eyebrow">Einstellungen</p>
        <h2 className="month-section-title">Globale Einstellungen</h2>
        <p className="month-section-copy">
          Zentrale App-Regeln, die monatsuebergreifend gelten und bewusst getrennt von der Monatsarbeit bleiben.
        </p>
      </header>

      <section className="month-section-panel space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="month-eyebrow">Globale Einstellungen</p>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
              Verwaltung
            </h3>
          </div>
          <span className="month-chip month-chip-neutral">{GLOBAL_SETTINGS.length} Bereich</span>
        </header>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GLOBAL_SETTINGS.map((setting) => (
            <Link
              key={setting.href}
              href={setting.href}
              className="group rounded-[1.25rem] border border-[color:var(--month-line)] bg-white/78 p-4 shadow-sm transition hover:border-[color:var(--month-line-strong)] hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                    {setting.meta}
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-[color:var(--month-ink)]">{setting.title}</h4>
                </div>
                <span className="rounded-full border border-[color:var(--month-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--month-ink-soft)] transition group-hover:border-[color:var(--month-line-strong)] group-hover:text-[#0f4c6d]">
                  Oeffnen
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">{setting.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
