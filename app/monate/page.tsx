import Link from "next/link";

import { formatEuro } from "@/src/dashboard/ui";
import { listMonthTimeline } from "@/src/months/repository";

export const dynamic = "force-dynamic";

export default function MonthsPage() {
  const months = listMonthTimeline();

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Monate
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          Monatsliste von der ersten Aktivitaet bis heute
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Jeder Monat ist direkt verlinkt und zeigt eine kompakte Vorschau auf Einnahmen,
          variable Ausgaben, Fixkosten-Plan und verfuegbar.
        </p>
      </header>

      <div className="grid gap-3">
        {months.map((month) => (
          <Link
            key={month.monthKey}
            href={month.detailHref}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {month.monthKey}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{month.label}</h3>
                <p className="mt-1 text-sm text-slate-600">Monatsdetailseite oeffnen</p>
              </div>

              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                Detailseite
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Einnahmen
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {formatEuro(month.incomeCents)}
                </p>
              </article>

              <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Variable Ausgaben
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {formatEuro(month.variableExpenseCents)}
                </p>
              </article>

              <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Fixkosten-Plan
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {formatEuro(month.plannedFixedCostsCents)}
                </p>
              </article>

              <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Verfuegbar
                </p>
                <p
                  className={`mt-2 text-base font-semibold ${
                    month.availableCents < 0 ? "text-red-700" : "text-slate-900"
                  }`}
                >
                  {formatEuro(month.availableCents)}
                </p>
              </article>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
