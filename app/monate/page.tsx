import Link from "next/link";

import {
  MonthChip,
  MonthHero,
  MonthPageShell,
  MonthSection,
  MonthStatCard,
} from "@/app/monate/months-ui";
import { formatEuro } from "@/src/dashboard/ui";
import { listMonthTimeline } from "@/src/months/repository";

export const dynamic = "force-dynamic";

export default function MonthsPage() {
  const months = listMonthTimeline();
  const latestMonth = months[0] ?? null;

  return (
    <MonthPageShell>
      <MonthHero
        eyebrow="Monate"
        title="Die Monatsarbeit an einem ruhigen Ort."
        description="Vom ersten Monat bis heute bleibt alles in einer klaren Timeline lesbar. Jeder Monat fuehlt sich wie ein eigener Arbeitsraum an statt wie eine weitere Verwaltungsliste."
        aside={
          latestMonth ? (
            <div className="rounded-[1.4rem] border border-[color:var(--month-line-strong)] bg-[color:rgba(255,255,255,0.7)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="month-eyebrow">Aktuellster Monat</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--month-ink)]">
                {latestMonth.label}
              </p>
              <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                Verfuegbar {formatEuro(latestMonth.availableCents)}
              </p>
            </div>
          ) : null
        }
      />

      <MonthSection
        eyebrow="Timeline"
        title="Lueckenlose Monatsliste"
        description="Ein Monat, ein Klick, ein klarer Einstieg. Die Vorschaukarten priorisieren nur die Zahlen, die du fuer den ersten Blick wirklich brauchst."
        aside={<MonthChip tone="accent">{months.length} Monate sichtbar</MonthChip>}
      >
        <div className="grid gap-4 lg:gap-5">
          {months.map((month, index) => (
            <Link
              key={month.monthKey}
              href={month.detailHref}
              className="group relative overflow-hidden rounded-[1.7rem] border border-[color:var(--month-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,247,250,0.92))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--month-line-strong)] hover:shadow-[0_26px_60px_rgba(15,23,42,0.10)] md:p-6"
            >
              <div className="absolute inset-y-5 left-0 w-1 rounded-full bg-[linear-gradient(180deg,var(--month-accent),rgba(125,211,252,0.12))]" />

              <div className="flex flex-col gap-5 pl-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <MonthChip tone={index === 0 ? "accent" : "neutral"}>{month.monthKey}</MonthChip>
                    {index === 0 ? <MonthChip tone="warn">Neuester Monat</MonthChip> : null}
                  </div>

                  <h2 className="mt-4 text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--month-ink)] md:text-[1.9rem]">
                    {month.label}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--month-ink-soft)] md:text-[0.96rem]">
                    Monatsdetailseite oeffnen und KPIs, Budgets, Fixkostenblock sowie die
                    komplette Buchungsliste an einer Stelle lesen.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-sm font-medium text-[color:var(--month-ink-soft)]">
                  <span>Monat oeffnen</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--month-line-strong)] bg-white text-base text-[color:var(--month-ink)] transition group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MonthStatCard label="Einnahmen" value={formatEuro(month.incomeCents)} />
                <MonthStatCard
                  label="Variable Ausgaben"
                  value={formatEuro(month.variableExpenseCents)}
                />
                <MonthStatCard
                  label="Fixkosten-Plan"
                  value={formatEuro(month.plannedFixedCostsCents)}
                  tone="calm"
                />
                <MonthStatCard
                  label="Verfuegbar"
                  value={formatEuro(month.availableCents)}
                  tone={month.availableCents < 0 ? "danger" : "default"}
                />
              </div>
            </Link>
          ))}
        </div>
      </MonthSection>
    </MonthPageShell>
  );
}
