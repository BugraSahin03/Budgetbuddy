import Link from "next/link";

import {
  MonthHero,
  MonthPageShell,
  MonthSection,
} from "@/app/monate/months-ui";
import { formatEuro } from "@/src/dashboard/ui";
import {
  listMonthComparison,
  type MonthComparisonRow,
} from "@/src/months/repository";

export const dynamic = "force-dynamic";

type MonthComparisonYearGroup = {
  year: string;
  months: MonthComparisonRow[];
};

function groupMonthsByYear(months: MonthComparisonRow[]): MonthComparisonYearGroup[] {
  const groups = new Map<string, MonthComparisonRow[]>();

  for (const month of months) {
    const year = month.monthKey.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), month]);
  }

  return Array.from(groups, ([year, groupedMonths]) => ({
    year,
    months: groupedMonths,
  }));
}

export default function MonthComparisonPage() {
  const months = listMonthComparison();
  const yearGroups = groupMonthsByYear(months);

  return (
    <MonthPageShell>
      <MonthHero
        eyebrow="Monatsvergleich"
        title="Monate ruhig vergleichen."
        description="Einnahmen, Ausgaben und echte Sparbuchungen pro Monat."
      />

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
                    <article className="grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(28rem,1.6fr)] lg:items-center">
                      <h2 className="text-[1.35rem] font-semibold tracking-[-0.035em] text-[color:var(--month-ink)] md:text-[1.65rem]">
                        {month.label}
                      </h2>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.1rem] border border-[color:var(--month-line)] bg-white/72 px-4 py-3">
                          <p className="month-stat-label">Einnahmen</p>
                          <p className="mt-2 text-lg font-semibold tracking-[-0.035em] text-emerald-700">
                            {formatEuro(month.incomeCents)}
                          </p>
                        </div>
                        <div className="rounded-[1.1rem] border border-[color:var(--month-line)] bg-white/72 px-4 py-3">
                          <p className="month-stat-label">Ausgaben</p>
                          <p className="mt-2 text-lg font-semibold tracking-[-0.035em] text-rose-600">
                            {formatEuro(month.expenseCents)}
                          </p>
                        </div>
                        <div className="rounded-[1.1rem] border border-[color:var(--month-line)] bg-white/72 px-4 py-3">
                          <p className="month-stat-label">Gespart</p>
                          <p className="mt-2 text-lg font-semibold tracking-[-0.035em] text-[#4f7d12]">
                            {formatEuro(month.savingsCents)}
                          </p>
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
