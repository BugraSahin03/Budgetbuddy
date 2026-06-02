import Link from "next/link";

import {
  MonthChip,
  MonthHero,
  MonthPageShell,
  MonthSection,
  MonthStatCard,
} from "@/app/monate/months-ui";
import { formatEuro } from "@/src/dashboard/ui";
import { listMonthComparison } from "@/src/months/repository";

export const dynamic = "force-dynamic";

function savedTone(savedCents: number): "default" | "danger" | "calm" {
  if (savedCents < 0) {
    return "danger";
  }

  if (savedCents > 0) {
    return "calm";
  }

  return "default";
}

function savedLabel(savedCents: number): string {
  if (savedCents < 0) {
    return "Defizit";
  }

  if (savedCents > 0) {
    return "Ueberschuss";
  }

  return "Ausgeglichen";
}

export default function MonthComparisonPage() {
  const months = listMonthComparison();
  const newestMonth = months[0] ?? null;
  const totalIncomeCents = months.reduce((sum, month) => sum + month.incomeCents, 0);
  const totalExpenseCents = months.reduce((sum, month) => sum + month.expenseCents, 0);
  const totalSavedCents = totalIncomeCents - totalExpenseCents;

  return (
    <MonthPageShell>
      <MonthHero
        eyebrow="Monatsvergleich"
        title="Monate schnell gegeneinander lesen."
        description="Eine kompakte Vergleichsansicht fuer Einnahmen, Ausgaben und den einfachen Ueberschuss pro Monat. Transfers bleiben bewusst ausserhalb der Ausgabenrechnung."
        aside={
          newestMonth ? (
            <div className="rounded-[1.4rem] border border-[color:var(--month-line-strong)] bg-[color:rgba(255,255,255,0.72)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="month-eyebrow">Neuester Monat</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--month-ink)]">
                {newestMonth.label}
              </p>
              <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                {savedLabel(newestMonth.savedCents)} {formatEuro(newestMonth.savedCents)}
              </p>
            </div>
          ) : null
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MonthStatCard label="Einnahmen gesamt" value={formatEuro(totalIncomeCents)} />
        <MonthStatCard label="Ausgaben gesamt" value={formatEuro(totalExpenseCents)} />
        <MonthStatCard
          label="Ueberschuss gesamt"
          value={formatEuro(totalSavedCents)}
          tone={savedTone(totalSavedCents)}
        />
      </section>

      <MonthSection
        eyebrow="Vergleich"
        title="Alle Monate seit der ersten Buchung"
        description="Die Liste bleibt schlicht und nachvollziehbar: Einnahmen minus Ausgaben ergibt hier den einfachen Ueberschuss. Eine echte Sparlogik wird separat betrachtet."
        aside={<MonthChip tone="accent">{months.length} Monate</MonthChip>}
      >
        <div className="grid gap-3">
          {months.map((month) => (
            <article
              key={month.monthKey}
              className="rounded-[1.45rem] border border-[color:var(--month-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] md:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <MonthChip tone={month.savedCents < 0 ? "warn" : "neutral"}>
                      {month.monthKey}
                    </MonthChip>
                    <MonthChip tone={month.savedCents > 0 ? "accent" : "neutral"}>
                      {savedLabel(month.savedCents)}
                    </MonthChip>
                  </div>
                  <h2 className="mt-3 text-[1.35rem] font-semibold tracking-[-0.035em] text-[color:var(--month-ink)] md:text-[1.65rem]">
                    {month.label}
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[34rem]">
                  <div>
                    <p className="month-stat-label">Einnahmen</p>
                    <p className="mt-1 text-lg font-semibold tracking-[-0.035em] text-[color:var(--month-ink)]">
                      {formatEuro(month.incomeCents)}
                    </p>
                  </div>
                  <div>
                    <p className="month-stat-label">Ausgaben</p>
                    <p className="mt-1 text-lg font-semibold tracking-[-0.035em] text-[color:var(--month-ink)]">
                      {formatEuro(month.expenseCents)}
                    </p>
                  </div>
                  <div>
                    <p className="month-stat-label">Gespart</p>
                    <p
                      className={`mt-1 text-lg font-semibold tracking-[-0.035em] ${
                        month.savedCents < 0 ? "text-red-700" : "text-sky-800"
                      }`}
                    >
                      {formatEuro(month.savedCents)}
                    </p>
                  </div>
                </div>

                <Link
                  href={month.detailHref}
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--month-line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--month-ink)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                >
                  Monat oeffnen
                </Link>
              </div>
            </article>
          ))}
        </div>
      </MonthSection>
    </MonthPageShell>
  );
}
