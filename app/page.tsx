import { getDashboardMonthSnapshot } from "@/src/dashboard/repository";
import { buildDashboardKpis, formatEuro } from "@/src/dashboard/ui";
import { formatMonthLabel, getCurrentMonthKey } from "@/src/months/repository";

export const dynamic = "force-dynamic";

function amountTone(cents: number): string {
  if (cents < 0) {
    return "text-red-100";
  }

  if (cents > 0) {
    return "text-emerald-100";
  }

  return "text-white";
}

function kpiAccent(label: string): string {
  if (label === "Einnahmen") {
    return "bg-emerald-300";
  }

  if (label === "Ausgaben") {
    return "bg-rose-300";
  }

  return "bg-sky-300";
}

export default async function HomePage() {
  const snapshot = getDashboardMonthSnapshot(getCurrentMonthKey());
  const kpis = buildDashboardKpis(snapshot);
  const monthLabel = formatMonthLabel(snapshot.totals.monthKey);
  const monthHref = `/monate/${snapshot.totals.monthKey}`;
  const openWorkLabel =
    snapshot.openAssignmentCount === 0
      ? "Alles zugeordnet"
      : `${snapshot.openAssignmentCount} Buchung${snapshot.openAssignmentCount === 1 ? "" : "en"} ohne Zuordnung`;

  return (
    <div className="month-page-shell space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[2.1rem] border border-white/12 bg-[linear-gradient(135deg,#071b46_0%,#0a2a4a_48%,#123f57_100%)] p-6 text-white shadow-[0_28px_70px_rgba(7,27,70,0.22)] md:p-8 xl:p-10">
        <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-cyan-200/16 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-emerald-200/12 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-100/72">Dashboard</p>
          <h1 className="mt-4 text-[clamp(2.7rem,7vw,6.2rem)] font-black leading-[0.88] tracking-[-0.085em]">
            {monthLabel}
          </h1>
          <p className="mt-7 text-sm font-bold uppercase tracking-[0.24em] text-cyan-100/68">
            Aktueller Stand
          </p>
          <p className={`mt-3 text-[4.1rem] font-semibold leading-none tracking-[-0.08em] md:text-[6rem] ${amountTone(snapshot.totals.availableCents)}`}>
            {formatEuro(snapshot.totals.availableCents)}
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {kpis.map((card) => (
          <article key={card.label} className="month-stat-card overflow-hidden">
            <div className={`mb-4 h-1.5 w-16 rounded-full ${kpiAccent(card.label)}`} aria-hidden="true" />
            <p className="month-stat-label">{card.label}</p>
            <p className={`month-stat-value mt-3 ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="month-section-panel">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Offene Arbeit</p>
            <h2 className="month-section-title mt-2">{openWorkLabel}</h2>
            <p className="month-section-copy mt-3 max-w-2xl">
              Gezaehlt werden nur Buchungen, die wirklich eine Kategorie oder Sonderkategorie brauchen. Transfers und Fixkosten-Kontrolltreffer bleiben draussen.
            </p>
          </div>
          <a
            href={monthHref}
            className="inline-flex w-fit rounded-full bg-[color:var(--month-ink)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(20,33,61,0.18)] transition hover:-translate-y-0.5"
          >
            Monatsansicht oeffnen
          </a>
        </div>
      </section>
    </div>
  );
}
