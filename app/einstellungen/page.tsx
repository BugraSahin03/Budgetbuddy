import Link from "next/link";

const GLOBAL_SETTINGS = [
  {
    href: "/einstellungen/import-aliase",
    title: "Import-Aliasse",
    meta: "Anzeigenamen",
  },
] as const;

export default function SettingsPage() {
  return (
    <section className="month-page-shell space-y-5">
      <header className="month-section-panel relative overflow-hidden">
        <span className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-sky-100/70 blur-2xl" aria-hidden="true" />
        <span className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-slate-200/60 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <p className="month-eyebrow">Einstellungen</p>
          <h2 className="month-section-title mt-1">Globale Einstellungen</h2>
        </div>
      </header>

      <section className="month-section-panel space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="month-eyebrow">Verwaltung</p>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
              Globale Einstellungen
            </h3>
          </div>
          <span className="month-chip month-chip-accent">{GLOBAL_SETTINGS.length} Bereich</span>
        </header>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GLOBAL_SETTINGS.map((setting) => (
            <Link
              key={setting.href}
              href={setting.href}
              className="group rounded-[1.35rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--month-line-strong)] hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-sky-100 text-sm font-black tracking-[-0.05em] text-[#0f4c6d]">
                    &#9881;
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                      {setting.meta}
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-[color:var(--month-ink)]">{setting.title}</h4>
                  </div>
                </div>
                <span className="rounded-full border border-[color:var(--month-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--month-ink-soft)] transition group-hover:border-[color:var(--month-line-strong)] group-hover:text-[#0f4c6d]">
                  Oeffnen
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
