import { getDashboardMonthSnapshot } from "@/src/dashboard/repository";
import { buildDashboardKpis, formatEuro } from "@/src/dashboard/ui";
import { formatMonthLabel } from "@/src/months/repository";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function amountTone(cents: number): string {
  if (cents < 0) {
    return "text-red-700";
  }

  if (cents > 0) {
    return "text-emerald-700";
  }

  return "text-[color:var(--month-ink)]";
}

function transactionTypeLabel(type: string): string {
  if (type === "transfer") {
    return "Transfer";
  }

  if (type === "income") {
    return "Einnahme";
  }

  if (type === "refund") {
    return "Rueckerstattung";
  }

  return "Ausgabe";
}

function transactionTypeTone(type: string): string {
  if (type === "transfer") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (type === "income" || type === "refund") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function assignmentLabel(transaction: {
  transactionType: string;
  categoryName: string | null;
  specialBudgetName: string | null;
  isFixedCostControl: boolean;
}): string {
  if (transaction.transactionType === "transfer") {
    return "Keine Zuordnung noetig";
  }

  if (transaction.isFixedCostControl) {
    return "Fixkosten-Kontrolle";
  }

  if (transaction.categoryName) {
    return transaction.categoryName;
  }

  if (transaction.specialBudgetName) {
    return transaction.specialBudgetName;
  }

  return "Ohne Zuordnung";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const selectedMonth = toSingleParam(params.month) ?? currentMonthKey();
  const snapshot = getDashboardMonthSnapshot(selectedMonth);
  const kpis = buildDashboardKpis(snapshot);
  const monthLabel = formatMonthLabel(snapshot.totals.monthKey);
  const monthHref = `/monate/${snapshot.totals.monthKey}`;
  const openWorkLabel =
    snapshot.openAssignmentCount === 0
      ? "Alles zugeordnet"
      : `${snapshot.openAssignmentCount} Buchung${snapshot.openAssignmentCount === 1 ? "" : "en"} ohne Zuordnung`;

  return (
    <div className="month-page-shell space-y-6 md:space-y-8">
      <section className="month-hero-panel relative overflow-hidden">
        <div className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
        <div className="month-hero-orb month-hero-orb-right" aria-hidden="true" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-end">
          <div>
            <p className="month-eyebrow">Dashboard</p>
            <h1 className="month-hero-title mt-3">{monthLabel}</h1>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--month-ink-muted)]">
              Aktueller Stand
            </p>
            <p className={`mt-3 text-[4rem] font-semibold leading-none tracking-[-0.075em] md:text-[5.5rem] ${amountTone(snapshot.totals.availableCents)}`}>
              {formatEuro(snapshot.totals.availableCents)}
            </p>
          </div>

          <aside className="rounded-[1.7rem] border border-[color:var(--month-line-strong)] bg-white/78 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.09)] backdrop-blur">
            <p className="month-eyebrow">Monat wechseln</p>
            <form action="/" method="get" className="mt-4 space-y-3">
              <label htmlFor="month" className="sr-only">
                Monat waehlen
              </label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={snapshot.totals.monthKey}
                className="w-full rounded-full border border-[color:var(--month-line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-[color:var(--month-ink)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(20,33,61,0.18)] transition hover:-translate-y-0.5"
              >
                Anzeigen
              </button>
            </form>
          </aside>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {kpis.map((card) => (
          <article key={card.label} className="month-stat-card">
            <p className="month-stat-label">{card.label}</p>
            <p className={`month-stat-value mt-3 ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <article className="month-section-panel">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <p className="month-eyebrow">Offene Arbeit</p>
              <h2 className="month-section-title mt-2">{openWorkLabel}</h2>
              <p className="month-section-copy mt-3">
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
        </article>

        <section className="month-section-panel">
          <div className="flex flex-col gap-3 border-b border-[color:var(--month-line)] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="month-eyebrow">Letzte Buchungen</p>
              <h2 className="month-section-title mt-2">Kurzblick auf den Monat</h2>
            </div>
            <span className="month-chip month-chip-neutral">max. 5</span>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.recentTransactions.length === 0 ? (
              <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/70 p-4 text-center text-sm text-[color:var(--month-ink-soft)]">
                Noch keine Buchungen in diesem Monat.
              </p>
            ) : (
              snapshot.recentTransactions.map((transaction) => (
                <article key={transaction.id} className="flex flex-col gap-3 rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/75 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                        {transaction.bookingDate}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionTypeTone(transaction.transactionType)}`}>
                        {transactionTypeLabel(transaction.transactionType)}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate font-semibold text-[color:var(--month-ink)]" title={transaction.description}>
                      {transaction.displayName}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                      {assignmentLabel(transaction)}
                    </p>
                  </div>
                  <p className={`text-lg font-semibold tracking-[-0.035em] ${amountTone(transaction.amountCents)}`}>
                    {formatEuro(transaction.amountCents)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
