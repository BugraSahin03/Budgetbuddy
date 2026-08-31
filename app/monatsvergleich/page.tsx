import Link from "next/link";

import {
  MonthHero,
  MonthPageShell,
  MonthSection,
} from "@/app/monate/months-ui";
import { MonthTrendChart, type MonthTrendSummary } from "@/app/monatsvergleich/month-trend-chart";
import { formatEuro } from "@/src/dashboard/ui";
import {
  listMonthComparison,
  type MonthComparisonRow,
} from "@/src/months/repository";

export const dynamic = "force-dynamic";

type MonthComparisonYearGroup = {
  year: string;
  months: MonthComparisonTrendRow[];
};

type MonthComparisonMetric = "income" | "expense" | "savings";

type MonthComparisonTrendRow = MonthComparisonRow & {
  previousMonthLabel: string | null;
  incomeDeltaCents: number | null;
  expenseDeltaCents: number | null;
  savingsDeltaCents: number | null;
};

type TrendSummary = MonthTrendSummary;

function buildTrendRows(months: MonthComparisonRow[]): MonthComparisonTrendRow[] {
  return months.map((month, index) => {
    const previousMonth = months[index + 1];

    return {
      ...month,
      previousMonthLabel: previousMonth?.label ?? null,
      incomeDeltaCents: previousMonth ? month.incomeCents - previousMonth.incomeCents : null,
      expenseDeltaCents: previousMonth ? month.expenseCents - previousMonth.expenseCents : null,
      savingsDeltaCents: previousMonth ? month.savingsCents - previousMonth.savingsCents : null,
    };
  });
}

function groupMonthsByYear(months: MonthComparisonTrendRow[]): MonthComparisonYearGroup[] {
  const groups = new Map<string, MonthComparisonTrendRow[]>();

  for (const month of months) {
    const year = month.monthKey.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), month]);
  }

  return Array.from(groups, ([year, groupedMonths]) => ({
    year,
    months: groupedMonths,
  }));
}

function getMetricValue(month: MonthComparisonRow, metric: MonthComparisonMetric): number {
  if (metric === "income") {
    return month.incomeCents;
  }

  if (metric === "expense") {
    return month.expenseCents;
  }

  return month.savingsCents;
}

function getMetricDelta(month: MonthComparisonTrendRow, metric: MonthComparisonMetric): number | null {
  if (metric === "income") {
    return month.incomeDeltaCents;
  }

  if (metric === "expense") {
    return month.expenseDeltaCents;
  }

  return month.savingsDeltaCents;
}

function formatDelta(deltaCents: number | null): string {
  if (deltaCents === null) {
    return "Kein Vormonat";
  }

  if (deltaCents === 0) {
    return "±0,00 €";
  }

  return `${deltaCents > 0 ? "+" : ""}${formatEuro(deltaCents)}`;
}

function getDeltaToneClassName(
  deltaCents: number | null,
  metric: MonthComparisonMetric,
): string {
  if (deltaCents === null || deltaCents === 0) {
    return "border-slate-200 bg-white/75 text-[color:var(--month-ink-soft)]";
  }

  const isPositiveDevelopment =
    metric === "expense" ? deltaCents < 0 : deltaCents > 0;

  return isPositiveDevelopment
    ? "border-emerald-200 bg-emerald-50/82 text-emerald-700"
    : "border-rose-200 bg-rose-50/82 text-rose-600";
}

function buildTrendSummaries(months: MonthComparisonTrendRow[]): TrendSummary[] {
  const visibleMonths = [...months].reverse();
  const latestMonth = months[0];
  const metrics: Array<{ metric: MonthComparisonMetric; label: string }> = [
    { metric: "income", label: "Einnahmen" },
    { metric: "expense", label: "Ausgaben" },
    { metric: "savings", label: "Gespart" },
  ];

  return metrics.map(({ metric, label }) => {
    const latestDelta = latestMonth ? getMetricDelta(latestMonth, metric) : null;

    return {
      metric,
      label,
      valueLabel: latestMonth ? formatEuro(getMetricValue(latestMonth, metric)) : "0,00 €",
      deltaLabel: formatDelta(latestDelta),
      deltaClassName: getDeltaToneClassName(latestDelta, metric),
      points: visibleMonths.map((month) => ({
        monthKey: month.monthKey,
        label: month.label,
        valueCents: getMetricValue(month, metric),
      })),
    };
  });
}

function DeltaPill({
  label,
  deltaCents,
  metric,
}: {
  label: string;
  deltaCents: number | null;
  metric: MonthComparisonMetric;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] ${getDeltaToneClassName(deltaCents, metric)}`}
    >
      <span>{label}</span>
      <span>{formatDelta(deltaCents)}</span>
    </span>
  );
}

export default function MonthComparisonPage() {
  const months = listMonthComparison();
  const trendRows = buildTrendRows(months);
  const trendSummaries = buildTrendSummaries(trendRows);
  const yearGroups = groupMonthsByYear(trendRows);

  return (
    <MonthPageShell>
      <MonthHero
        eyebrow="Monatsvergleich"
        title="Monate ruhig vergleichen."
        description="Einnahmen, Ausgaben inklusive Fixkosten und echte Sparbuchungen pro Monat."
      />

      <MonthTrendChart summaries={trendSummaries} />

      <MonthSection eyebrow="Monate" title="Alle Monate">
        <div className="grid gap-4">
          {yearGroups.map((group) => (
            <details
              key={group.year}
              open
              className="group/year overflow-hidden rounded-[1.65rem] border border-[color:var(--month-line)] bg-[rgba(255,255,255,0.55)] shadow-[0_14px_34px_rgba(15,23,42,0.04)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 md:px-5 [&::-webkit-details-marker]:hidden">
                <div>
                  <p className="month-eyebrow">Zahlenbuch</p>
                  <h3 className="text-xl font-semibold tracking-[-0.035em] text-[color:var(--month-ink)] md:text-2xl">
                    {group.year}
                  </h3>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--month-line)] bg-white/82 text-lg font-semibold text-[color:var(--month-ink)] transition group-open/year:rotate-90">
                  ›
                </span>
              </summary>

              <div className="grid gap-3 border-t border-[color:var(--month-line)] p-3 md:p-4">
                {group.months.map((month) => (
                  <Link
                    key={month.monthKey}
                    href={month.detailHref}
                    className="block rounded-[1.45rem] border border-[color:var(--month-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)] md:p-5"
                  >
                    <article className="grid gap-4 xl:grid-cols-[minmax(12rem,0.75fr)_minmax(28rem,1.45fr)] xl:items-center">
                      <div>
                        <h2 className="text-[1.35rem] font-semibold tracking-[-0.035em] text-[color:var(--month-ink)] md:text-[1.65rem]">
                          {month.label}
                        </h2>
                        <p className="mt-2 text-xs font-bold text-[color:var(--month-ink-soft)]">
                          {month.previousMonthLabel
                            ? `Vergleich mit ${month.previousMonthLabel}`
                            : "Erster Monat im Vergleich"}
                        </p>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-2 rounded-[1.15rem] border border-[color:var(--month-line)] bg-white/66 p-3 sm:grid-cols-3">
                          <div>
                            <p className="month-stat-label">Einnahmen</p>
                            <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
                              {formatEuro(month.incomeCents)}
                            </p>
                          </div>
                          <div>
                            <p className="month-stat-label">Ausgaben</p>
                            <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
                              {formatEuro(month.expenseCents)}
                            </p>
                          </div>
                          <div>
                            <p className="month-stat-label">Gespart</p>
                            <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
                              {formatEuro(month.savingsCents)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="month-stat-label mr-1">Veränderung</span>
                          <DeltaPill label="Ein" deltaCents={month.incomeDeltaCents} metric="income" />
                          <DeltaPill label="Aus" deltaCents={month.expenseDeltaCents} metric="expense" />
                          <DeltaPill label="Spar" deltaCents={month.savingsDeltaCents} metric="savings" />
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </MonthSection>
    </MonthPageShell>
  );
}
