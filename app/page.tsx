import { getDashboardMonthSnapshot } from "@/src/dashboard/repository";
import {
  buildDashboardKpis,
  categoryStatusLabel,
  categoryStatusTone,
  countOverBudgetWarnings,
  formatEuro,
  specialBudgetStatusLabel,
  specialBudgetStatusTone,
} from "@/src/dashboard/ui";
import { listManualTransactions } from "@/src/transactions/repository";

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

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${month}.${year}`;
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

function transactionTypeLabel(type: string): string {
  if (type === "transfer") {
    return "Transfer";
  }

  if (type === "income") {
    return "Einkommen";
  }

  if (type === "refund") {
    return "Rueckerstattung";
  }

  return "Ausgabe";
}

function metricToneClass(tone: string): string {
  if (tone.includes("red")) {
    return "text-red-700";
  }

  if (tone.includes("amber")) {
    return "text-amber-700";
  }

  if (tone.includes("violet")) {
    return "text-indigo-700";
  }

  return "text-[color:var(--month-ink)]";
}

function progressWidth(spentCents: number, budgetCents: number | null): string {
  if (budgetCents === null || budgetCents <= 0) {
    return "0%";
  }

  return `${Math.min(100, Math.round((spentCents / budgetCents) * 100))}%`;
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

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const selectedMonth = toSingleParam(params.month) ?? new Date().toISOString().slice(0, 7);

  const snapshot = getDashboardMonthSnapshot(selectedMonth);
  const kpis = buildDashboardKpis(snapshot);
  const warningCount = countOverBudgetWarnings(snapshot);
  const primaryKpis = kpis.filter((card) => card.label !== "Verfuegbar").slice(0, 4);
  const secondaryKpis = kpis.filter((card) => !primaryKpis.includes(card) && card.label !== "Verfuegbar");

  const monthTransactions = listManualTransactions()
    .filter((row) => row.bookingDate.slice(0, 7) === selectedMonth)
    .slice(0, 10);

  const transferCount = monthTransactions.filter(
    (row) => row.transactionType === "transfer",
  ).length;

  const overBudgetRows = snapshot.categoryRows.filter(
    (row) => categoryStatusLabel(row) === "Ueber Budget",
  );

  return (
    <div className="month-page-shell space-y-6 md:space-y-8">
      <section className="month-hero-panel relative overflow-hidden">
        <div className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
        <div className="month-hero-orb month-hero-orb-right" aria-hidden="true" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end">
          <div>
            <p className="month-eyebrow">Monatsdashboard</p>
            <h1 className="month-hero-title mt-3">
              {formatMonthLabel(snapshot.totals.monthKey)} im Fokus.
            </h1>
            <p className="month-hero-copy mt-4">
              Ein ruhiger Monatsblick fuer Budget, Fixkosten und Zuordnung. Die Hauptzahl bleibt im Vordergrund, Details folgen gefuehrt darunter.
            </p>

            <form action="/" method="get" className="mt-6 flex max-w-md flex-col gap-3 rounded-[1.25rem] border border-[color:var(--month-line)] bg-white/70 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="month" className="month-stat-label">
                  Monat waehlen
                </label>
                <input
                  id="month"
                  name="month"
                  type="month"
                  defaultValue={snapshot.totals.monthKey}
                  className="mt-2 w-full rounded-full border border-[color:var(--month-line)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--month-ink)] outline-none transition focus:border-[color:var(--month-line-strong)]"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-[color:var(--month-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(20,33,61,0.18)] transition hover:-translate-y-0.5"
              >
                Laden
              </button>
            </form>
          </div>

          <aside className="rounded-[1.7rem] border border-[color:var(--month-line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,249,255,0.86))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.09)] backdrop-blur">
            <p className="month-eyebrow">Verfuegbar</p>
            <p className={`mt-4 text-[3.2rem] font-semibold leading-none tracking-[-0.065em] md:text-[4rem] ${amountTone(snapshot.totals.availableCents)}`}>
              {formatEuro(snapshot.totals.availableCents)}
            </p>
            <p className="mt-4 text-sm leading-6 text-[color:var(--month-ink-soft)]">
              Einnahmen minus variable Ausgaben und aktive Fixkosten. Budgets bleiben Leitplanken, keine Sperren.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="month-chip month-chip-accent">
                {warningCount} Warnung(en)
              </span>
              <span className="month-chip month-chip-neutral">
                {transferCount} Transfer(s)
              </span>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {primaryKpis.map((card) => (
          <article key={card.label} className="month-stat-card">
            <p className="month-stat-label">{card.label}</p>
            <p className={`month-stat-value mt-3 ${metricToneClass(card.tone)}`}>{card.value}</p>
          </article>
        ))}
      </section>

      {warningCount > 0 ? (
        <section className="rounded-[1.65rem] border border-red-200/80 bg-[linear-gradient(180deg,rgba(255,247,247,0.96),rgba(254,242,242,0.9))] p-5 shadow-[0_18px_45px_rgba(127,29,29,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Warnbereich</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-red-950">
                {warningCount} Budgetueberschreitung(en) aktiv
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-800">
                Bitte pruefen, ob Umbuchung oder Sonderbudget-Anpassung noetig ist.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {overBudgetRows.slice(0, 3).map((row) => (
                <span key={row.categoryId} className="rounded-full border border-red-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-red-700">
                  {row.categoryName}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="month-section-panel">
          <div className="flex flex-col gap-3 border-b border-[color:var(--month-line)] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="month-eyebrow">Kategorien</p>
              <h2 className="month-section-title mt-2">Budget / Ist / Rest</h2>
              <p className="month-section-copy mt-2">
                Kategorien als ruhige Budgetkarten. Transfers bleiben hier bewusst ausserhalb der Ausgaben.
              </p>
            </div>
            <span className="month-chip month-chip-warn">Transfers ausgeschlossen</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {snapshot.categoryRows.map((row) => {
              const statusLabel = categoryStatusLabel(row);
              const statusTone = categoryStatusTone(row);

              return (
                <article key={row.categoryId} className="rounded-[1.35rem] border border-[color:var(--month-line)] bg-white/75 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.025em] text-[color:var(--month-ink)]">
                        {row.categoryName}
                      </h3>
                      <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                        Ist {formatEuro(row.spentAmountCents)}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${statusLabel === "Ueber Budget" ? "bg-red-400" : "bg-sky-400"}`}
                      style={{ width: progressWidth(row.spentAmountCents, row.budgetAmountCents) }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="month-stat-label">Budget</p>
                      <p className="mt-1 font-semibold text-[color:var(--month-ink)]">
                        {row.budgetAmountCents === null ? "-" : formatEuro(row.budgetAmountCents)}
                      </p>
                    </div>
                    <div>
                      <p className="month-stat-label">Rest</p>
                      <p className={`mt-1 font-semibold ${row.remainingAmountCents !== null && row.remainingAmountCents < 0 ? "text-red-700" : "text-[color:var(--month-ink)]"}`}>
                        {row.remainingAmountCents === null ? "-" : formatEuro(row.remainingAmountCents)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="month-section-panel">
            <div className="border-b border-[color:var(--month-line)] pb-4">
              <p className="month-eyebrow">Sonderbudgets</p>
              <h2 className="month-section-title mt-2">Separat geplant</h2>
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.specialBudgetRows.length === 0 ? (
                <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/70 p-4 text-sm text-[color:var(--month-ink-soft)]">
                  Keine Sonderbudgets fuer diesen Monat vorhanden.
                </p>
              ) : (
                snapshot.specialBudgetRows.map((row) => (
                  <article key={row.id} className="rounded-[1.25rem] border border-[color:var(--month-line)] bg-white/75 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[color:var(--month-ink)]">{row.name}</h3>
                        <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                          Ist {formatEuro(row.actualExpenseCents)} von {formatEuro(row.plannedAmountCents)}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${specialBudgetStatusTone(row)}`}>
                        {specialBudgetStatusLabel(row)}
                      </span>
                    </div>
                    <p className={`mt-3 text-lg font-semibold tracking-[-0.035em] ${row.remainingAmountCents < 0 ? "text-red-700" : "text-[color:var(--month-ink)]"}`}>
                      Rest {formatEuro(row.remainingAmountCents)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="month-section-panel">
            <div className="border-b border-[color:var(--month-line)] pb-4">
              <p className="month-eyebrow">Weitere Kennzahlen</p>
              <h2 className="month-section-title mt-2">Kontrolle</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {secondaryKpis.map((card) => (
                <div key={card.label} className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-[color:var(--month-line)] bg-white/70 px-4 py-3">
                  <p className="text-sm font-semibold text-[color:var(--month-ink-soft)]">{card.label}</p>
                  <p className={`text-sm font-bold ${metricToneClass(card.tone)}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="month-section-panel">
        <div className="flex flex-col gap-3 border-b border-[color:var(--month-line)] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Monatsbuchungen</p>
            <h2 className="month-section-title mt-2">Letzte Buchungen mit Transfer-Markierung</h2>
            <p className="month-section-copy mt-2">
              Eine reduzierte Liste fuer schnelle Orientierung. Detailarbeit bleibt in Monats- und Transaktionsansicht.
            </p>
          </div>
          <span className="month-chip month-chip-accent">{transferCount} Transfer(s)</span>
        </div>

        <div className="mt-5 space-y-3">
          {monthTransactions.length === 0 ? (
            <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/70 p-4 text-center text-sm text-[color:var(--month-ink-soft)]">
              Keine manuellen Buchungen im ausgewaehlten Monat.
            </p>
          ) : (
            monthTransactions.map((transaction) => (
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
                  <h3 className="mt-2 font-semibold text-[color:var(--month-ink)]">{transaction.description}</h3>
                  <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                    {transaction.destinationAccountName
                      ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
                      : transaction.accountName}
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
    </div>
  );
}
