import Link from "next/link";

import { MonthChip, MonthPageShell } from "@/app/monate/months-ui";
import { listMonthTimeline } from "@/src/months/repository";

export const dynamic = "force-dynamic";

export default function MonthsPage() {
  const months = listMonthTimeline();

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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {months.map((month, index) => (
            <Link
              key={month.monthKey}
              href={month.detailHref}
              className={`group flex min-h-[7.25rem] items-center justify-between gap-4 rounded-[1.65rem] border p-5 shadow-[0_16px_34px_rgba(7,27,70,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(7,27,70,0.09)] ${
                index === 0
                  ? "border-[color:var(--month-line-strong)] bg-[#e8f8ff]"
                  : "border-[color:var(--month-line)] bg-white/82 hover:border-[color:var(--month-line-strong)]"
              }`}
            >
              <span>
                <span className="block text-[1.45rem] font-black tracking-[-0.045em] text-[color:var(--month-ink)] md:text-[1.7rem]">
                  {month.label}
                </span>
                {index === 0 ? (
                  <span className="mt-3 inline-flex">
                    <MonthChip tone="accent">Neuester Monat</MonthChip>
                  </span>
                ) : null}
              </span>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/82 text-lg font-black text-[color:var(--month-ink)] shadow-[0_12px_24px_rgba(7,27,70,0.06)] transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </MonthPageShell>
  );
}
