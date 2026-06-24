import Link from "next/link";

import { MonthChip, MonthPageShell } from "@/app/monate/months-ui";
import {
  listMonthTimeline,
  type MonthTimelinePreview,
} from "@/src/months/repository";

export const dynamic = "force-dynamic";

type MonthTimelineYearGroup = {
  year: string;
  months: MonthTimelinePreview[];
};

function groupMonthsByYear(
  months: MonthTimelinePreview[],
): MonthTimelineYearGroup[] {
  const groups: MonthTimelineYearGroup[] = [];

  for (const month of months) {
    const year = month.monthKey.slice(0, 4);
    const currentGroup = groups.at(-1);

    if (currentGroup?.year === year) {
      currentGroup.months.push(month);
    } else {
      groups.push({ year, months: [month] });
    }
  }

  return groups;
}

export default function MonthsPage() {
  const months = listMonthTimeline();
  const yearGroups = groupMonthsByYear(months);
  const newestMonthKey = months[0]?.monthKey ?? null;

  return (
    <MonthPageShell>
      <section className="month-reference-hero py-10 md:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="month-eyebrow">Monate</p>
          <h1 className="mt-3 text-[clamp(2.4rem,7vw,4.8rem)] font-black leading-[0.9] tracking-[-0.08em] text-[color:var(--month-ink)]">
            Monatsauswahl
          </h1>
        </div>
      </section>

      <section className="month-reference-panel bg-white/74">
        <div className="grid gap-5">
          {yearGroups.map((group) => (
            <details
              key={group.year}
              open
              className="group/year rounded-[2rem] border border-[color:var(--month-line)] bg-white/62 p-4 shadow-[0_16px_34px_rgba(7,27,70,0.04)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[1.4rem] px-2 py-1 marker:hidden">
                <span>
                  <span className="month-eyebrow">Jahr</span>
                  <span className="mt-1 block text-[clamp(2.15rem,7vw,3.7rem)] font-black leading-none tracking-[-0.08em] text-[color:var(--month-ink)]">
                    {group.year}
                  </span>
                </span>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--month-line)] bg-white/86 text-xl font-black text-[color:var(--month-ink)] shadow-[0_12px_24px_rgba(7,27,70,0.05)] transition group-open/year:rotate-90">
                  ›
                </span>
              </summary>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.months.map((month) => {
                  const isNewestMonth = month.monthKey === newestMonthKey;

                  return (
                    <Link
                      key={month.monthKey}
                      href={month.detailHref}
                      className={`group flex min-h-[7.25rem] items-center justify-between gap-4 rounded-[1.65rem] border p-5 shadow-[0_16px_34px_rgba(7,27,70,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(7,27,70,0.09)] ${
                        isNewestMonth
                          ? "border-[color:var(--month-line-strong)] bg-[#e8f8ff]"
                          : "border-[color:var(--month-line)] bg-white/82 hover:border-[color:var(--month-line-strong)]"
                      }`}
                    >
                      <span>
                        <span className="block text-[1.45rem] font-black tracking-[-0.045em] text-[color:var(--month-ink)] md:text-[1.7rem]">
                          {month.label}
                        </span>
                        {isNewestMonth ? (
                          <span className="mt-3 inline-flex">
                            <MonthChip tone="accent">Neuester Monat</MonthChip>
                          </span>
                        ) : null}
                      </span>
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/82 text-lg font-black text-[color:var(--month-ink)] shadow-[0_12px_24px_rgba(7,27,70,0.06)] transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </section>
    </MonthPageShell>
  );
}
