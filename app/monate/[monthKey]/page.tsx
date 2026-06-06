import type { ReactNode } from "react";
import Link from "next/link";

import {
  CategoryVisualMark,
  categoryProgressStyle,
  categorySoftStyle,
} from "@/app/components/category-visual";
import {
  setMonthlyBudgetOverrideAction,
  updateMonthlySpecialBudgetAction,
  updateMonthlySpecialBudgetStateAction,
  updateMonthlyTransactionAssignmentAction,
} from "@/app/monate/actions";
import { MonthActionOverlay } from "@/app/monate/month-action-overlay";
import { MonthDialog } from "@/app/monate/month-dialog";
import { MonthChip, MonthPageShell } from "@/app/monate/months-ui";
import {
  categoryStatusLabel,
  categoryStatusTone,
  countOverBudgetWarnings,
  formatEuro,
  specialBudgetStatusLabel,
  specialBudgetStatusTone,
} from "@/src/dashboard/ui";
import { listCategories } from "@/src/categories/repository";
import { getMonthDetail, type MonthDetailTransactionRow } from "@/src/months/repository";
import {
  listActiveAccountOptions,
  listActiveCategoryOptions,
  listActiveSpecialBudgetOptionsForMonth,
} from "@/src/transactions/repository";

export const dynamic = "force-dynamic";

type MonthDetailPageProps = {
  params: Promise<{ monthKey: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CategoryVisual = {
  name: string;
  iconName: string | null;
  colorHex: string | null;
};

function categoryVisualById(
  categories: ReturnType<typeof listCategories>,
): Map<number, CategoryVisual> {
  return new Map(
    categories.map((category) => [
      category.id,
      {
        name: category.name,
        iconName: category.iconName,
        colorHex: category.colorHex,
      },
    ]),
  );
}

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

  return "border-red-200 bg-red-50 text-red-700";
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

function transactionSubtitle(transaction: MonthDetailTransactionRow): string {
  const account = transaction.destinationAccountName
    ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
    : transaction.accountName;

  return [transaction.bookingDate, account, assignmentLabel(transaction)].filter(Boolean).join(" · ");
}

function TransactionVisualMark({
  transaction,
  categoryVisuals,
}: {
  transaction: MonthDetailTransactionRow;
  categoryVisuals: Map<number, CategoryVisual>;
}) {
  if (transaction.categoryId) {
    const category = categoryVisuals.get(transaction.categoryId);

    return (
      <CategoryVisualMark
        name={category?.name ?? transaction.categoryName ?? "Kategorie"}
        iconName={category?.iconName}
        colorHex={category?.colorHex}
        className="h-12 w-12 text-sm"
      />
    );
  }

  if (transaction.specialBudgetId) {
    return (
      <span className="category-visual-mark h-12 w-12 border-amber-200 bg-amber-100 text-sm text-amber-900">
        SB
      </span>
    );
  }

  if (transaction.transactionType === "expense") {
    return (
      <span className="category-visual-mark h-12 w-12 border-red-200 bg-red-100 text-lg text-red-700">
        ?
      </span>
    );
  }

  return (
    <span className="category-visual-mark h-12 w-12 border-sky-200 bg-sky-100 text-sm text-sky-800">
      {transaction.transactionType === "transfer" ? "TR" : "+"}
    </span>
  );
}

function categoryUsagePercent(row: {
  budgetAmountCents: number | null;
  spentAmountCents: number;
}): number {
  if (row.budgetAmountCents === null || row.budgetAmountCents <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((row.spentAmountCents / row.budgetAmountCents) * 100));
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
      className="group inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-semibold text-[color:var(--month-ink)] shadow-[0_12px_28px_rgba(7,27,70,0.07)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
    >
      <span className="text-[color:var(--month-ink-soft)]">{arrow}</span>
      <span>
        <span className="sr-only">{description}: </span>
        {label}
      </span>
    </Link>
  );
}

function ReferenceMetricCard({
  label,
  value,
  copy,
  tone,
  marker,
  action,
  actionClassName,
}: {
  label: string;
  value: string;
  copy: string;
  tone: "income" | "expense";
  marker: string;
  action?: ReactNode;
  actionClassName?: string;
}) {
  const toneClasses =
    tone === "income"
      ? "bg-[#8bf0df] text-[#055c52]"
      : "bg-[#74171d] text-white";

  const valueClass = tone === "income" ? "text-[#08766b]" : "text-[#f17680]";

  return (
    <article className="month-reference-card relative min-h-[10rem] p-6">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses}`}>
        <span className="text-lg font-bold leading-none">{marker}</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[color:var(--month-ink-soft)]">{label}</p>
      <p className={`mt-2 text-[2rem] font-extrabold tracking-[-0.055em] ${valueClass}`}>
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-[color:var(--month-ink-muted)]">{copy}</p>
      {action ? <div className={actionClassName ?? "mt-4"}>{action}</div> : null}
    </article>
  );
}

function EmptyReferenceCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[color:var(--month-line-strong)] bg-white/54 px-5 py-8 text-center text-sm leading-6 text-[color:var(--month-ink-soft)]">
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="month-eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[color:var(--month-ink)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--month-ink-soft)]">
            {description}
          </p>
        ) : null}
      </div>
      {aside}
    </div>
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
  const allCategories = listCategories();
  const categoryVisuals = categoryVisualById(allCategories);
  const visualCategoryOptions = allCategories
    .filter((category) => category.isActive)
    .map((category) => ({
      id: category.id,
      name: category.name,
      iconName: category.iconName,
      colorHex: category.colorHex,
    }));
  const accountOptions = listActiveAccountOptions();
  const categoryOptions = listActiveCategoryOptions();
  const specialBudgetOptions = listActiveSpecialBudgetOptionsForMonth(month.monthKey);
  const defaultAccountId =
    accountOptions.find((account) => account.name === "Sparkasse")?.id ??
    accountOptions[0]?.id ??
    null;
  const warningCount = countOverBudgetWarnings(month.dashboard);
  const recentExpenses = month.transactions
    .filter((transaction) => transaction.transactionType === "expense")
    .slice(0, 5);

  return (
    <MonthPageShell>
      <section className="month-reference-hero">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--month-ink)] text-lg font-bold text-white shadow-[0_16px_32px_rgba(7,27,70,0.18)]">
              BB
            </div>
            <p className="text-base font-extrabold tracking-[-0.03em] text-[color:var(--month-ink)]">
              BudgetBuddy
            </p>
          </div>
          <div className="flex justify-end">
            <MonthActionOverlay
              monthKey={month.monthKey}
              monthLabel={month.label}
              accountOptions={accountOptions}
              categoryOptions={visualCategoryOptions}
              specialBudgetOptions={specialBudgetOptions}
              defaultAccountId={defaultAccountId}
            />
          </div>
        </div>

        <div className="mt-8 max-w-3xl md:ml-16 md:mt-10">
          <p className="month-eyebrow">Monatsueberblick</p>
          <h1 className="mt-1 text-[clamp(2.5rem,8vw,4.6rem)] font-black leading-[0.92] tracking-[-0.085em] text-[color:var(--month-ink)]">
            {month.label}
          </h1>
          <p className="mt-5 flex items-center gap-2 text-sm font-extrabold text-[#14766e]">
            <span aria-hidden="true">↗</span>
            Einnahmen, Ausgaben und Budgetarbeit in einer ruhigen Finanzsicht.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <MonthNavLink
              href={month.previousMonth.href}
              label={month.previousMonth.label}
              direction="previous"
            />
            {month.nextMonth ? (
              <MonthNavLink href={month.nextMonth.href} label={month.nextMonth.label} direction="next" />
            ) : null}
          </div>
        </div>
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

      <section className="grid gap-6 md:grid-cols-2">
        <ReferenceMetricCard
          label="Einnahmen"
          value={formatEuro(month.dashboard.totals.incomeCents)}
          copy="Alle Einkommen und Rueckerstattungen dieses Monats."
          tone="income"
          marker="↙"
        />
        <ReferenceMetricCard
          label="Ausgaben"
          value={formatEuro(month.dashboard.totals.expenseCents)}
          copy="Variable Ausgaben ohne separaten Fixkosten-Kontrollblock."
          tone="expense"
          marker="↗"
          actionClassName="absolute right-6 top-6"
          action={
            <MonthDialog
              eyebrow="Fixkostenkontrolle"
              title="Plan und Ist-Kontrolle"
              description="Die Kontrolle bleibt im Monatskontext erreichbar, nimmt aber keinen dauerhaften Platz in der Uebersicht ein."
              triggerLabel="Fixkostenkontrolle"
              triggerClassName="month-dialog-trigger month-dialog-trigger-rose"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.4rem] bg-[#eef8fd] p-5">
                  <p className="month-eyebrow">Fixkosten (Plan)</p>
                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                    {formatEuro(month.dashboard.totals.plannedFixedCostsCents)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">
                    Stabiler Planblock fuer die Verfuegbarkeit dieses Monats.
                  </p>
                </div>
                <div className="rounded-[1.4rem] bg-[#eef8fd] p-5">
                  <p className="month-eyebrow">Ist-Kontrolle</p>
                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                    {formatEuro(month.dashboard.totals.actualFixedCostsCents)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">
                    {month.dashboard.totals.actualFixedCostsCents > 0
                      ? "Importierte Fixkosten-Kontrolltreffer wurden erkannt."
                      : "Aktuell kein importierter Fixkosten-Kontrollhinweis."}
                  </p>
                </div>
              </div>
            </MonthDialog>
          }
        />
      </section>

      <section className="grid gap-7 xl:grid-cols-[1.08fr_1fr]">
        <article className="month-reference-panel bg-[#dff4fd]">
          <SectionHeader
            eyebrow="Budget Breakdown"
            title="Kategorien"
            aside={
              <div className="flex flex-wrap items-center gap-3">
                <MonthChip tone="accent">{month.dashboard.categoryRows.length} Kategorien</MonthChip>
                <MonthDialog
                  eyebrow="Monatsarbeit"
                  title="Budgetpflege"
                  description="Normale Kategorienbudgets und Sonderbudgets bleiben fachlich getrennt, werden aber gemeinsam im Monatskontext gepflegt."
                  triggerLabel="Budgetpflege"
                >
                  <div className="grid gap-5">
                    <section>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="month-eyebrow">Kategorien</p>
                          <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-[color:var(--month-ink)]">
                            Normale Kategorienbudgets
                          </h3>
                        </div>
                        <MonthChip tone="accent">{month.dashboard.categoryRows.length} Kategorien</MonthChip>
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        {month.dashboard.categoryRows.map((row) => {
                          const category = categoryVisuals.get(row.categoryId);

                          return (
                            <article
                              key={row.categoryId}
                              className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-5 shadow-[0_14px_30px_rgba(7,27,70,0.045)]"
                              style={categorySoftStyle(category?.colorHex)}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 gap-3">
                                  <CategoryVisualMark
                                    name={category?.name ?? row.categoryName}
                                    iconName={category?.iconName}
                                    colorHex={category?.colorHex}
                                    className="h-11 w-11 text-sm"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="truncate text-base font-extrabold tracking-[-0.03em] text-[color:var(--month-ink)]">
                                      {row.categoryName}
                                    </h4>
                                    <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                                      Ist {formatEuro(row.spentAmountCents)} · Rest {row.remainingAmountCents === null ? "-" : formatEuro(row.remainingAmountCents)}
                                    </p>
                                  </div>
                                </div>
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStatusTone(row)}`}>
                                  {categoryStatusLabel(row)}
                                </span>
                              </div>
                              <form action={setMonthlyBudgetOverrideAction} className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <input type="hidden" name="monthKey" value={month.monthKey} />
                                <input type="hidden" name="categoryId" value={row.categoryId} />
                                <input
                                  name="budgetAmount"
                                  inputMode="decimal"
                                  defaultValue={toInputAmount(row.monthOverrideAmountCents ?? row.budgetAmountCents)}
                                  placeholder={row.defaultBudgetAmountCents === null ? "z. B. 250.00" : `Standard ${toInputAmount(row.defaultBudgetAmountCents)}`}
                                  className="rounded-xl border border-[color:var(--month-line-strong)] bg-white px-3 py-2 text-sm text-[color:var(--month-ink)] focus:border-sky-400 focus:outline-none"
                                />
                                <button type="submit" className="rounded-xl bg-[color:var(--month-ink)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5">
                                  Speichern
                                </button>
                              </form>
                              <p className="mt-3 text-xs leading-5 text-[color:var(--month-ink-soft)]">
                                Leerer Wert entfernt nur den Monats-Override fuer {month.label}.
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-[1.7rem] border border-amber-200 bg-amber-50/70 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="month-eyebrow text-amber-700">Sonderbudgets</p>
                          <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-amber-950">
                            Monatsspezifische Ausgabenziele
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-amber-900/80">
                            Hell markiert, damit Sonderbudgets gemeinsam erreichbar bleiben, aber nicht mit normalen Kategorien verschmelzen.
                          </p>
                        </div>
                        <MonthChip tone="warn">{month.dashboard.specialBudgetRows.length} Eintraege</MonthChip>
                      </div>
                      <div className="mt-5 space-y-4">
                        {month.dashboard.specialBudgetRows.length === 0 ? (
                          <EmptyReferenceCard>Keine Sonderbudgets fuer diesen Monat vorhanden.</EmptyReferenceCard>
                        ) : (
                          month.dashboard.specialBudgetRows.map((row) => (
                            <article key={row.id} className="rounded-[1.4rem] border border-amber-200 bg-white/88 p-5 shadow-[0_14px_30px_rgba(146,64,14,0.06)]">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h4 className="text-base font-extrabold tracking-[-0.03em] text-[color:var(--month-ink)]">
                                    {row.name}
                                  </h4>
                                  <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                                    Ist {formatEuro(row.actualExpenseCents)} · Rest {formatEuro(row.remainingAmountCents)}
                                  </p>
                                </div>
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${specialBudgetStatusTone(row)}`}>
                                  {specialBudgetStatusLabel(row)}
                                </span>
                              </div>
                              <form action={updateMonthlySpecialBudgetAction} className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <input type="hidden" name="monthKey" value={month.monthKey} />
                                <input type="hidden" name="specialBudgetId" value={row.id} />
                                <input
                                  name="plannedAmount"
                                  inputMode="decimal"
                                  defaultValue={toInputAmount(row.plannedAmountCents)}
                                  placeholder="z. B. 120.00"
                                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-[color:var(--month-ink)] focus:border-amber-400 focus:outline-none"
                                />
                                <button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5">
                                  Speichern
                                </button>
                              </form>
                              <form action={updateMonthlySpecialBudgetStateAction} className="mt-3">
                                <input type="hidden" name="monthKey" value={month.monthKey} />
                                <input type="hidden" name="specialBudgetId" value={row.id} />
                                {row.isActive ? (
                                  <button type="submit" name="intent" value="deactivate" className="text-xs font-bold text-amber-800 underline decoration-amber-300 underline-offset-4">
                                    Sonderbudget deaktivieren
                                  </button>
                                ) : (
                                  <button type="submit" name="intent" value="reactivate" className="text-xs font-bold text-emerald-700 underline decoration-emerald-200 underline-offset-4">
                                    Sonderbudget reaktivieren
                                  </button>
                                )}
                              </form>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </MonthDialog>
              </div>
            }
          />

          <div className="mt-7 space-y-5">
            {month.dashboard.categoryRows.length === 0 ? (
              <EmptyReferenceCard>Noch keine Kategorien fuer diesen Monat vorhanden.</EmptyReferenceCard>
            ) : (
              month.dashboard.categoryRows.map((row) => {
                const category = categoryVisuals.get(row.categoryId);
                const usagePercent = categoryUsagePercent(row);

                return (
                  <div key={row.categoryId} className="grid gap-3">
                    <div className="flex items-center gap-4">
                      <CategoryVisualMark
                        name={category?.name ?? row.categoryName}
                        iconName={category?.iconName}
                        colorHex={category?.colorHex}
                        className="h-12 w-12 text-sm"
                        variant="neutral"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                            {row.categoryName}
                          </p>
                          <p className="shrink-0 text-sm font-extrabold text-[color:var(--month-ink)]">
                            {formatEuro(row.spentAmountCents)}
                          </p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/85">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${usagePercent}%`,
                              ...categoryProgressStyle(category?.colorHex),
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                          <span>{row.budgetAmountCents === null ? "Budget fehlt" : `${usagePercent}% genutzt`}</span>
                          <span>{row.budgetAmountCents === null ? "Kein Planwert" : `Plan ${formatEuro(row.budgetAmountCents)}`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="month-reference-panel min-w-0 overflow-hidden bg-white/82">
          <SectionHeader
            eyebrow="Letzte Bewegung"
            title="Letzte Ausgaben"
            aside={<span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--month-ink)]">Top 5</span>}
          />

          <div className="mt-7 space-y-4">
            {recentExpenses.length === 0 ? (
              <EmptyReferenceCard>Keine Ausgaben fuer diesen Monat vorhanden.</EmptyReferenceCard>
            ) : (
              recentExpenses.map((transaction) => (
                <div key={`${transaction.sourceType}-${transaction.id}`} className="month-expense-row">
                  <TransactionVisualMark
                    transaction={transaction}
                    categoryVisuals={categoryVisuals}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                      {transaction.description}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[color:var(--month-ink-soft)]">
                      {transactionSubtitle(transaction)}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-black tracking-[-0.035em] text-[#f17680]">
                    {formatEuro(transaction.amountCents)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <details className="month-reference-panel month-disclosure min-w-0 overflow-hidden bg-white/78">
        <summary className="month-disclosure-summary">
          <span className="mt-2 block text-2xl font-extrabold tracking-[-0.045em] text-[color:var(--month-ink)]">
            Alle Monatsbuchungen
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <MonthChip tone="neutral">{month.transactions.length} Eintraege</MonthChip>
            <span className="month-disclosure-chevron" aria-hidden="true">›</span>
          </span>
        </summary>
        <div className="mt-7 space-y-4">
          {month.transactions.length === 0 ? (
            <EmptyReferenceCard>Keine Buchungen fuer diesen Monat vorhanden.</EmptyReferenceCard>
          ) : (
            month.transactions.map((transaction) => (
              <article key={`${transaction.sourceType}-${transaction.id}`} className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[color:var(--month-line)] bg-white/86 p-5 shadow-[0_12px_28px_rgba(7,27,70,0.04)]">
                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                  <div className="flex min-w-0 gap-4">
                    <TransactionVisualMark
                      transaction={transaction}
                      categoryVisuals={categoryVisuals}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-extrabold tracking-[-0.03em] text-[color:var(--month-ink)]">
                        {transaction.description}
                      </h3>
                      <p className="mt-1 truncate text-sm text-[color:var(--month-ink-soft)]">
                        {transactionSubtitle(transaction)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${transactionTypeTone(transaction.transactionType)}`}>
                          {transactionTypeLabel(transaction.transactionType)}
                        </span>
                        <span className="inline-flex rounded-full border border-[color:var(--month-line)] bg-white px-2.5 py-1 text-xs font-medium text-[color:var(--month-ink-soft)]">
                          {transaction.sourceType === "import"
                            ? `Import${transaction.importRunId ? ` #${transaction.importRunId}` : ""}`
                            : "Manuell"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="shrink-0 text-right text-xl font-black tracking-[-0.045em] text-[color:var(--month-ink)]">
                    {formatEuro(transaction.amountCents)}
                  </p>
                </div>

                {transaction.transactionType === "expense" ? (
                  <form action={updateMonthlyTransactionAssignmentAction} className="mt-5 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input type="hidden" name="monthKey" value={month.monthKey} />
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <select
                      name="categoryId"
                      defaultValue={String(transaction.categoryId ?? "")}
                      className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm text-[color:var(--month-ink)]"
                    >
                      <option value="">Kategorie</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="specialBudgetId"
                      defaultValue={String(transaction.specialBudgetId ?? "")}
                      className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm text-[color:var(--month-ink)]"
                    >
                      <option value="">Sonderbudget</option>
                      {specialBudgetOptions.map((budget) => (
                        <option key={budget.id} value={budget.id}>
                          {budget.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-xl bg-[color:var(--month-ink)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5">
                      Speichern
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </details>
    </MonthPageShell>
  );
}
