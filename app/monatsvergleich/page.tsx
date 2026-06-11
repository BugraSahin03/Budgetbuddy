import Link from "next/link";

import {
  MonthHero,
  MonthPageShell,
  MonthSection,
} from "@/app/monate/months-ui";
import { formatEuro } from "@/src/dashboard/ui";
import { listMonthComparison } from "@/src/months/repository";

export const dynamic = "force-dynamic";

export default function MonthComparisonPage() {
  const months = listMonthComparison();

  return (
    <MonthPageShell>
      <MonthHero
        eyebrow="Monatsvergleich"
        title="Monate ruhig vergleichen."
        description="Einnahmen, Ausgaben und echte Sparbuchungen pro Monat."
      />

      <MonthSection eyebrow="Monate" title="Alle Monate">
        <div className="grid gap-3">
          {months.map((month) => (
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
      </MonthSection>
    </MonthPageShell>
  );
}
