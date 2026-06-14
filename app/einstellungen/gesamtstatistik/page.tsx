import Link from "next/link";

import { formatEuro } from "@/src/dashboard/ui";
import { listLifetimeStats } from "@/src/analytics/lifetime-stats";

export const dynamic = "force-dynamic";

type StatCardProps = {
  eyebrow: string;
  title: string;
  value: string;
  tone: "income" | "expense" | "savings";
};

const STAT_TONES: Record<StatCardProps["tone"], string> = {
  income: "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-emerald-100/70",
  expense: "border-rose-200 bg-rose-50/90 text-rose-600 shadow-rose-100/70",
  savings: "border-lime-200 bg-lime-50/90 text-[#4f7d12] shadow-lime-100/70",
};

function StatCard({ eyebrow, title, value, tone }: StatCardProps) {
  return (
    <article className="min-h-36 rounded-[1.65rem] border border-[color:var(--month-line)] bg-white/88 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      <p className="month-eyebrow">{eyebrow}</p>
      <h3 className="mt-2 text-base font-semibold text-[color:var(--month-ink)]">{title}</h3>
      <p
        className={`mt-5 inline-flex rounded-2xl border px-4 py-2.5 text-3xl font-black tracking-[-0.06em] shadow-sm ${STAT_TONES[tone]}`}
      >
        {value}
      </p>
    </article>
  );
}

export default function LifetimeStatsPage() {
  const stats = listLifetimeStats();
  const hasYears = stats.years.length > 0;

  return (
    <section className="month-page-shell space-y-5">
      <header className="month-section-panel relative min-h-40 overflow-hidden md:min-h-44">
        <span className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true" />
        <span className="absolute bottom-0 left-12 h-28 w-28 rounded-full bg-sky-100/70 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-full flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/einstellungen"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-soft)] transition hover:text-[color:var(--month-ink)]"
            >
              ← Einstellungen
            </Link>
            <p className="month-eyebrow mt-6">Gesamtstatistik</p>
            <h2 className="mt-1 text-5xl font-black leading-[0.92] tracking-[-0.08em] text-[color:var(--month-ink)] md:text-6xl">
              BudgetBuddy in Zahlen
            </h2>
          </div>
          <span className="inline-flex w-fit rounded-full border border-[color:var(--month-line)] bg-white/78 px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-soft)]">
            Read-only Insights
          </span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          eyebrow="Seit Beginn"
          title="Einnahmen gesamt"
          value={formatEuro(stats.totals.incomeCents)}
          tone="income"
        />
        <StatCard
          eyebrow="Seit Beginn"
          title="Ausgaben gesamt"
          value={formatEuro(stats.totals.expenseCents)}
          tone="expense"
        />
        <StatCard
          eyebrow="Seit Beginn"
          title="Gespart gesamt"
          value={formatEuro(stats.totals.savingsCents)}
          tone="savings"
        />
      </section>

      <section className="month-section-panel space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Jahreswerte</p>
            <h3 className="text-xl font-semibold tracking-[-0.035em] text-[color:var(--month-ink)]">
              Zahlenbuch nach Jahren
            </h3>
          </div>
          <span className="month-chip month-chip-accent">
            {stats.years.length} {stats.years.length === 1 ? "Jahr" : "Jahre"}
          </span>
        </header>

        {hasYears ? (
          <div className="grid gap-3">
            {stats.years.map((year) => (
              <details
                key={year.year}
                open
                className="group/year overflow-hidden rounded-[1.45rem] border border-[color:var(--month-line)] bg-white/72 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="month-eyebrow">Zahlenbuch</p>
                    <h4 className="text-2xl font-black tracking-[-0.06em] text-[color:var(--month-ink)]">
                      {year.year}
                    </h4>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--month-line)] bg-white text-lg font-semibold text-[color:var(--month-ink)] transition group-open/year:rotate-90">
                    ›
                  </span>
                </summary>
                <div className="grid gap-3 border-t border-[color:var(--month-line)] p-3 md:grid-cols-3">
                  <div className="rounded-[1.05rem] bg-emerald-50/70 px-4 py-3">
                    <p className="month-stat-label">Einnahmen</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.035em] text-emerald-700">
                      {formatEuro(year.incomeCents)}
                    </p>
                  </div>
                  <div className="rounded-[1.05rem] bg-rose-50/70 px-4 py-3">
                    <p className="month-stat-label">Ausgaben</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.035em] text-rose-600">
                      {formatEuro(year.expenseCents)}
                    </p>
                  </div>
                  <div className="rounded-[1.05rem] bg-lime-50/70 px-4 py-3">
                    <p className="month-stat-label">Gespart</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.035em] text-[#4f7d12]">
                      {formatEuro(year.savingsCents)}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.45rem] border border-dashed border-[color:var(--month-line-strong)] bg-white/62 p-6 text-sm font-semibold text-[color:var(--month-ink-soft)]">
            Noch keine Transaktionen erfasst. Sobald die ersten echten Buchungen vorhanden sind, entsteht hier dein Zahlenbuch.
          </div>
        )}
      </section>
    </section>
  );
}
