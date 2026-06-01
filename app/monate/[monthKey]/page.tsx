import Link from "next/link";

import { setMonthlyBudgetOverrideAction } from "@/app/monate/actions";
import {
  MonthChip,
  MonthHero,
  MonthPageShell,
  MonthSection,
  MonthStatCard,
  MonthTableShell,
} from "@/app/monate/months-ui";
import {
  buildDashboardKpis,
  categoryStatusLabel,
  categoryStatusTone,
  countOverBudgetWarnings,
  formatEuro,
  specialBudgetStatusLabel,
  specialBudgetStatusTone,
} from "@/src/dashboard/ui";
import { getMonthDetail } from "@/src/months/repository";

export const dynamic = "force-dynamic";

type MonthDetailPageProps = {
  params: Promise<{ monthKey: string }>;
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

function toInputAmount(amountCents: number | null): string {
  if (amountCents === null) {
    return "";
  }

  return (amountCents / 100).toFixed(2);
}

function transactionTypeTone(type: string): string {
  if (type === "transfer") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (type === "income" || type === "refund") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
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

function assignmentLabel(row: {
  transactionType: string;
  categoryName: string | null;
  specialBudgetName: string | null;
}): string {
  if (row.transactionType === "expense") {
    return row.categoryName ?? row.specialBudgetName ?? "Offen";
  }

  if (row.transactionType === "transfer") {
    return "Transfer";
  }

  return "Keine Zuordnung noetig";
}

function MonthNavLink({
  href,
  label,
  direction,
}: {
  href: string;
  label: string;
  direction: "previous" | "next";
}) {
  const arrow = direction === "previous" ? "←" : "→";
  const description = direction === "previous" ? "Vorheriger Monat" : "Naechster Monat";

  return (
    <Link
      href={href}
      className="group flex min-w-[12rem] items-center justify-between rounded-[1.25rem] border border-[color:var(--month-line)] bg-white/80 px-4 py-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[color:var(--month-line-strong)]"
    >
      <div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
          {description}
        </p>
        <p className="mt-1 text-sm font-semibold text-[color:var(--month-ink)]">{label}</p>
      </div>
      <span className="text-lg text-[color:var(--month-ink-soft)] transition group-hover:text-[color:var(--month-ink)]">
        {arrow}
      </span>
    </Link>
  );
}

function MonthMutedCard({
  label,
  value,
  copy,
}: {
  label: string;
  value?: string;
  copy: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[color:var(--month-line)] bg-[color:var(--month-surface-muted)] p-5">
      <p className="month-eyebrow">{label}</p>
      {value ? (
        <p className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-[color:var(--month-ink)]">
          {value}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">{copy}</p>
    </article>
  );
}

export default async function MonthDetailPage({
  params,
  searchParams,
}: MonthDetailPageProps) {
  const { monthKey } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const notice = toSingleParam(resolvedSearchParams.notice);
  const error = toSingleParam(resolvedSearchParams.error);
  const month = getMonthDetail(monthKey);
  const kpis = buildDashboardKpis(month.dashboard);
  const warningCount = countOverBudgetWarnings(month.dashboard);

  return (
    <MonthPageShell>
      <MonthHero
        eyebrow="Monatsdetail"
        title={month.label}
        description="Ein Monat, eine vollstaendige Sicht: Kennzahlen, Budgets, Fixkostenblock und Buchungen in einer klaren Lesereihenfolge."
        aside={
          <div className="flex flex-col gap-3 md:items-end">
            <MonthChip tone="neutral">{month.monthKey}</MonthChip>
            <div className="flex flex-wrap gap-3">
              <MonthNavLink
                href={month.previousMonth.href}
                label={month.previousMonth.label}
                direction="previous"
              />
              {month.nextMonth ? (
                <MonthNavLink
                  href={month.nextMonth.href}
                  label={month.nextMonth.label}
                  direction="next"
                />
              ) : (
                <div className="flex min-w-[12rem] items-center justify-between rounded-[1.25rem] border border-dashed border-[color:var(--month-line)] bg-white/55 px-4 py-3 text-left text-[color:var(--month-ink-muted)]">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
                      Naechster Monat
                    </p>
                    <p className="mt-1 text-sm font-semibold">Aktuellster Monat</p>
                  </div>
                  <span className="text-lg">→</span>
                </div>
              )}
            </div>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <MonthStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.label === "Verfuegbar" && month.dashboard.totals.availableCents < 0 ? "danger" : "default"}
          />
        ))}
      </section>

      {warningCount > 0 ? (
        <section className="rounded-[1.7rem] border border-red-200 bg-[linear-gradient(135deg,rgba(254,242,242,0.98),rgba(255,255,255,0.94))] p-5 shadow-[0_16px_40px_rgba(185,28,28,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="month-eyebrow text-red-700">Warnbereich</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-red-950">
                {warningCount} Budgetueberschreitung(en) aktiv
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/80">
                Dieser Monat enthaelt mindestens eine klare Budgetwarnung und sollte zuerst
                auf Monatsseite geprueft werden.
              </p>
            </div>

            <MonthChip tone="warn">Bitte zuerst pruefen</MonthChip>
          </div>
        </section>
      ) : null}

      {notice ? (
        <section className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[1.3rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800">
          {error}
        </section>
      ) : null}

      <MonthSection
        eyebrow="Budgets"
        title="Kategorien im Monatskontext"
        description="Hier wird der Monatswert pro Kategorie gepflegt. Ohne Monats-Override greift automatisch der globale Standardwert aus /budgets."
        aside={<MonthChip tone="accent">Kategorien {month.dashboard.categoryRows.length}</MonthChip>}
      >
        <MonthTableShell>
          <table className="month-table min-w-full">
            <thead>
              <tr>
                <th>Kategorie</th>
                <th>Budget</th>
                <th>Ist</th>
                <th>Rest</th>
                <th>Status</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              {month.dashboard.categoryRows.map((row) => (
                <tr key={row.categoryId}>
                  <td className="font-semibold text-[color:var(--month-ink)]">{row.categoryName}</td>
                  <td>
                    <form action={setMonthlyBudgetOverrideAction} className="flex min-w-[15rem] flex-col gap-2 md:min-w-[17rem]">
                      <input type="hidden" name="monthKey" value={month.monthKey} />
                      <input type="hidden" name="categoryId" value={row.categoryId} />
                      <div className="flex items-center gap-2">
                        <input
                          name="budgetAmount"
                          inputMode="decimal"
                          defaultValue={toInputAmount(row.monthOverrideAmountCents ?? row.budgetAmountCents)}
                          placeholder={row.defaultBudgetAmountCents === null ? "z. B. 250.00" : `Standard ${toInputAmount(row.defaultBudgetAmountCents)}`}
                          className="w-full rounded-lg border border-[color:var(--month-line-strong)] bg-white px-3 py-2 text-sm text-[color:var(--month-ink)] focus:border-sky-400 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-200"
                        >
                          Speichern
                        </button>
                      </div>
                      <p className="text-xs leading-5 text-[color:var(--month-ink-soft)]">
                        Leerer Wert entfernt nur den Monats-Override fuer {month.label}.
                      </p>
                    </form>
                  </td>
                  <td>{formatEuro(row.spentAmountCents)}</td>
                  <td>{row.remainingAmountCents === null ? "-" : formatEuro(row.remainingAmountCents)}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStatusTone(row)}`}
                    >
                      {categoryStatusLabel(row)}
                    </span>
                  </td>
                  <td className="text-xs text-[color:var(--month-ink-soft)]">
                    {row.monthOverrideAmountCents !== null
                      ? "Monats-Override aktiv"
                      : row.defaultBudgetAmountCents !== null
                        ? "Globaler Standard"
                        : "Noch kein Budgetwert"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MonthTableShell>
      </MonthSection>

      <MonthSection
        eyebrow="Sonderbudgets"
        title="Monatsspezifische Ausgabenziele"
        description="Sonderbudgets stehen sichtbar neben den regulären Kategorien und bleiben als eigene Monatsentscheidung lesbar."
        aside={<MonthChip tone="neutral">{month.dashboard.specialBudgetRows.length} Eintraege</MonthChip>}
      >
        <MonthTableShell>
          <table className="month-table min-w-full">
            <thead>
              <tr>
                <th>Sonderbudget</th>
                <th>Geplant</th>
                <th>Ist</th>
                <th>Rest</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {month.dashboard.specialBudgetRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[color:var(--month-ink-soft)]">
                    Keine Sonderbudgets fuer diesen Monat vorhanden.
                  </td>
                </tr>
              ) : (
                month.dashboard.specialBudgetRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold text-[color:var(--month-ink)]">{row.name}</td>
                    <td>{formatEuro(row.plannedAmountCents)}</td>
                    <td>{formatEuro(row.actualExpenseCents)}</td>
                    <td>{formatEuro(row.remainingAmountCents)}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${specialBudgetStatusTone(row)}`}
                      >
                        {specialBudgetStatusLabel(row)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </MonthTableShell>
      </MonthSection>

      <MonthSection
        eyebrow="Fixkostenblock"
        title="Plan und Kontrollsicht nebeneinander"
        description="Der Planbetrag bleibt sichtbar, waehrend erkannte Importtreffer als ruhige Kontrollinformation danebenstehen."
        aside={<MonthChip tone="violet">Ist-Kontrolle {formatEuro(month.dashboard.totals.actualFixedCostsCents)}</MonthChip>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <MonthMutedCard
            label="Fixkosten (Plan)"
            value={formatEuro(month.dashboard.totals.plannedFixedCostsCents)}
            copy="Der monatliche Planblock reduziert den verfuegbaren Betrag direkt und bleibt als stabile Leitplanke sichtbar."
          />
          <MonthMutedCard
            label="Kontrollsicht"
            copy={
              month.dashboard.totals.actualFixedCostsCents > 0
                ? "Es wurden importierte Fixkosten-Kontrolltreffer in diesem Monat erkannt."
                : "Fuer diesen Monat gibt es aktuell keinen importierten Fixkosten-Kontrollhinweis."
            }
          />
        </div>
      </MonthSection>

      <MonthSection
        eyebrow="Buchungen"
        title="Komplette Buchungsliste des Monats"
        description="Alle Monatsbuchungen bleiben in einer konsistenten Tabelle lesbar, inklusive Typ, Zuordnung und Quelle."
        aside={<MonthChip tone="neutral">{month.transactions.length} Eintraege</MonthChip>}
      >
        <MonthTableShell>
          <table className="month-table min-w-full">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Buchung</th>
                <th>Konto</th>
                <th>Betrag</th>
                <th>Typ</th>
                <th>Zuordnung</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              {month.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[color:var(--month-ink-soft)]">
                    Keine Buchungen fuer diesen Monat vorhanden.
                  </td>
                </tr>
              ) : (
                month.transactions.map((transaction) => (
                  <tr key={`${transaction.sourceType}-${transaction.id}`}>
                    <td>{transaction.bookingDate}</td>
                    <td className="font-semibold text-[color:var(--month-ink)]">{transaction.description}</td>
                    <td>
                      {transaction.destinationAccountName
                        ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
                        : transaction.accountName}
                    </td>
                    <td>{formatEuro(transaction.amountCents)}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${transactionTypeTone(transaction.transactionType)}`}
                      >
                        {transactionTypeLabel(transaction.transactionType)}
                      </span>
                    </td>
                    <td>{assignmentLabel(transaction)}</td>
                    <td>
                      {transaction.sourceType === "import"
                        ? `Import${transaction.importRunId ? ` #${transaction.importRunId}` : ""}`
                        : "Manuell"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </MonthTableShell>
      </MonthSection>
    </MonthPageShell>
  );
}
