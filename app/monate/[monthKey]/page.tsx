import type { ReactNode } from "react";
import Link from "next/link";

import { CategoryVisualMark } from "@/app/components/category-visual";
import {
  deleteMonthlyImportedTransactionAction,
  deleteMonthlyManualTransactionAction,
  setMonthlyBudgetOverrideAction,
  updateMonthlyManualTransactionAction,
  updateMonthlySpecialBudgetAction,
  updateMonthlySpecialBudgetStateAction,
  updateMonthlyTransactionAssignmentAction,
} from "@/app/monate/actions";
import { MonthActionOverlay } from "@/app/monate/month-action-overlay";
import { MonthDialog } from "@/app/monate/month-dialog";
import { MonthChip, MonthPageShell } from "@/app/monate/months-ui";
import {
  countOverBudgetWarnings,
  formatEuro,
  specialBudgetStatusLabel,
  specialBudgetStatusTone,
} from "@/src/dashboard/ui";
import { listCategories } from "@/src/categories/repository";
import {
  getMonthDetail,
  type MonthDetailTransactionRow,
} from "@/src/months/repository";
import {
  categoryUsageChipClassName,
  categoryUsageProgressStyle,
  categoryUsageSurfaceStyle,
  getCategoryUsageState,
} from "@/src/months/category-usage";
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

function toTransactionAmountInput(amountCents: number): string {
  return (Math.abs(amountCents) / 100).toFixed(2);
}

function amountTone(amountCents: number): string {
  if (amountCents < 0) {
    return "text-[#d24d5a]";
  }

  if (amountCents > 0) {
    return "text-[#08766b]";
  }

  return "text-[color:var(--month-ink)]";
}

function budgetStandTone(amountCents: number): string {
  if (amountCents < 0) {
    return "text-[#d24d5a]";
  }

  return "text-[#08766b]";
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

function sourceLabel(
  sourceType: MonthDetailTransactionRow["sourceType"],
): string {
  return sourceType === "import" ? "Import" : "Manuell";
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

function assignmentTone(row: MonthDetailTransactionRow): string {
  if (row.transactionType !== "expense") {
    return "border-slate-200 bg-white text-[color:var(--month-ink-soft)]";
  }

  if (row.specialBudgetId !== null) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (row.categoryId !== null) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function assignmentChipLabel(row: MonthDetailTransactionRow): string {
  if (row.transactionType !== "expense") {
    return transactionTypeLabel(row.transactionType);
  }

  if (row.specialBudgetName) {
    return `${row.specialBudgetName} · Sonderbudget`;
  }

  if (row.categoryName) {
    return row.categoryName;
  }

  return "Zuordnen";
}

function transactionSubtitle(transaction: MonthDetailTransactionRow): string {
  const account = transaction.destinationAccountName
    ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
    : transaction.accountName;

  return [transaction.bookingDate, account, assignmentLabel(transaction)]
    .filter(Boolean)
    .join(" · ");
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
        className="h-10 w-10 text-xs"
        variant="neutral"
      />
    );
  }

  if (transaction.specialBudgetId) {
    return (
      <span className="category-visual-mark h-10 w-10 border-amber-200 bg-amber-100 text-xs text-amber-900">
        SB
      </span>
    );
  }

  if (transaction.transactionType === "expense") {
    return (
      <span className="category-visual-mark h-10 w-10 border-red-200 bg-red-100 text-base text-red-700">
        ?
      </span>
    );
  }

  return (
    <span className="category-visual-mark h-10 w-10 border-sky-200 bg-sky-100 text-xs text-sky-800">
      {transaction.transactionType === "transfer" ? "TR" : "+"}
    </span>
  );
}

function bookingEditHref(monthKey: string, isBookingEditMode: boolean): string {
  return isBookingEditMode
    ? `/monate/${monthKey}#monatsbuchungen`
    : `/monate/${monthKey}?bookingEdit=1#monatsbuchungen`;
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
  const description =
    direction === "previous" ? "Vorheriger Monat" : "Naechster Monat";

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
  tone: "income" | "expense" | "savings" | "plan";
  marker: string;
  action?: ReactNode;
  actionClassName?: string;
}) {
  const toneClasses = {
    income: "bg-[#8bf0df] text-[#055c52]",
    expense: "bg-[#74171d] text-white",
    savings: "bg-[#d9f7b5] text-[#365f08]",
    plan: "bg-[#d7edf8] text-[color:var(--month-ink)]",
  }[tone];

  const valueClass = {
    income: "text-[#08766b]",
    expense: "text-[#f17680]",
    savings: "text-[#4f7d12]",
    plan: "text-[color:var(--month-ink)]",
  }[tone];

  return (
    <article className="month-reference-card relative min-h-[10rem] p-6">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses}`}
      >
        <span className="text-lg font-bold leading-none">{marker}</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[color:var(--month-ink-soft)]">
        {label}
      </p>
      <p
        className={`mt-2 text-[2rem] font-extrabold tracking-[-0.055em] ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-[color:var(--month-ink-muted)]">
        {copy}
      </p>
      {action ? (
        <div className={actionClassName ?? "mt-4"}>{action}</div>
      ) : null}
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
  const isBookingEditMode =
    toSingleParam(resolvedSearchParams.bookingEdit) === "1";
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
  const specialBudgetOptions = listActiveSpecialBudgetOptionsForMonth(
    month.monthKey,
  );
  const defaultAccountId =
    accountOptions.find((account) => account.name === "Sparkasse")?.id ??
    accountOptions[0]?.id ??
    null;
  const warningCount = countOverBudgetWarnings(month.dashboard);
  const recentExpenses = month.transactions
    .filter((transaction) => transaction.transactionType === "expense")
    .slice(0, 5);
  const activeSpecialBudgetRows = month.dashboard.specialBudgetRows.filter(
    (row) => row.isActive,
  );

  return (
    <MonthPageShell>
      <section className="month-reference-hero">
        <div className="flex items-center justify-between gap-4">
          <p className="month-eyebrow">Monatsueberblick</p>
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

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.52fr)] lg:items-end">
          <div className="max-w-3xl md:mt-3">
            <h1 className="text-[clamp(2.5rem,8vw,4.6rem)] font-black leading-[0.92] tracking-[-0.085em] text-[color:var(--month-ink)]">
              {month.label}
            </h1>
            <div className="mt-7 flex flex-wrap gap-3">
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
              ) : null}
            </div>
          </div>
          <article className="month-budget-stand-card">
            <p className="month-eyebrow">Aktueller Budgetstand</p>
            <p
              className={`mt-3 text-[clamp(2.05rem,4.6vw,3.4rem)] font-black tracking-[-0.075em] ${budgetStandTone(month.dashboard.totals.availableCents)}`}
            >
              {formatEuro(month.dashboard.totals.availableCents)}
            </p>
          </article>
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
                Dieser Monat enthaelt mindestens eine klare Budgetwarnung und
                sollte zuerst auf Monatsseite geprueft werden.
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

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
        <ReferenceMetricCard
          label="Gespart"
          value={formatEuro(month.dashboard.totals.savingsCents)}
          copy="Echte Buchungen der Kategorie Sparen."
          tone="savings"
          marker="↟"
        />
        <ReferenceMetricCard
          label="Rest nach Planung"
          value={formatEuro(
            month.dashboard.planSummary.planRestAfterBudgetPotsCents,
          )}
          copy="Einnahmen minus Kategorien."
          tone="plan"
          marker="≈"
        />
      </section>

      <section className="grid gap-7 xl:grid-cols-[1.08fr_1fr]">
        <article className="month-reference-panel bg-[#dff4fd]">
          <SectionHeader
            eyebrow="Budget Breakdown"
            title="Kategorien"
            aside={
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[1.2rem] border border-white/70 bg-white/72 px-4 py-3 text-right shadow-[0_12px_28px_rgba(7,27,70,0.06)]">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
                    Geplant
                  </p>
                  <p className="mt-1 text-sm font-black text-[color:var(--month-ink)]">
                    {formatEuro(
                      month.dashboard.planSummary.plannedBudgetPotCents,
                    )}
                  </p>
                </div>
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
                        <MonthChip tone="accent">
                          Plan{" "}
                          {formatEuro(
                            month.dashboard.planSummary
                              .plannedCategoryBudgetCents,
                          )}
                        </MonthChip>
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        {month.dashboard.categoryRows.map((row) => {
                          const category = categoryVisuals.get(row.categoryId);
                          const usageState = getCategoryUsageState(row);

                          return (
                            <article
                              key={row.categoryId}
                              className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-5 shadow-[0_14px_30px_rgba(7,27,70,0.045)]"
                              style={categoryUsageSurfaceStyle(usageState)}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 gap-3">
                                  <CategoryVisualMark
                                    name={category?.name ?? row.categoryName}
                                    iconName={category?.iconName}
                                    className="h-11 w-11 text-sm"
                                    variant="neutral"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="truncate text-base font-extrabold tracking-[-0.03em] text-[color:var(--month-ink)]">
                                      {row.categoryName}
                                    </h4>
                                    <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                                      Ist {formatEuro(row.spentAmountCents)} ·
                                      Rest{" "}
                                      {row.remainingAmountCents === null
                                        ? "-"
                                        : formatEuro(row.remainingAmountCents)}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryUsageChipClassName(usageState)}`}
                                >
                                  {usageState.label}
                                </span>
                              </div>
                              <form
                                action={setMonthlyBudgetOverrideAction}
                                className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                              >
                                <input
                                  type="hidden"
                                  name="monthKey"
                                  value={month.monthKey}
                                />
                                <input
                                  type="hidden"
                                  name="categoryId"
                                  value={row.categoryId}
                                />
                                <input
                                  name="budgetAmount"
                                  inputMode="decimal"
                                  defaultValue={toInputAmount(
                                    row.monthOverrideAmountCents ??
                                      row.budgetAmountCents,
                                  )}
                                  placeholder={
                                    row.defaultBudgetAmountCents === null
                                      ? "z. B. 250.00"
                                      : `Standard ${toInputAmount(row.defaultBudgetAmountCents)}`
                                  }
                                  className="rounded-xl border border-[color:var(--month-line-strong)] bg-white px-3 py-2 text-sm text-[color:var(--month-ink)] focus:border-sky-400 focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-[color:var(--month-ink)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5"
                                >
                                  Speichern
                                </button>
                              </form>
                              <p className="mt-3 text-xs leading-5 text-[color:var(--month-ink-soft)]">
                                Leerer Wert entfernt nur den Monats-Override fuer{" "}
                                {month.label}.
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-[1.7rem] border border-amber-200 bg-amber-50/70 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="month-eyebrow text-amber-700">
                            Sonderbudgets
                          </p>
                          <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-amber-950">
                            Monatsspezifische Ausgabenziele
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-amber-900/80">
                            Hell markiert, damit Sonderbudgets gemeinsam
                            erreichbar bleiben, aber nicht mit normalen
                            Kategorien verschmelzen.
                          </p>
                        </div>
                        <MonthChip tone="warn">
                          {month.dashboard.specialBudgetRows.length} Eintraege
                        </MonthChip>
                      </div>
                      <div className="mt-5 space-y-4">
                        {month.dashboard.specialBudgetRows.length === 0 ? (
                          <EmptyReferenceCard>
                            Keine Sonderbudgets fuer diesen Monat vorhanden.
                          </EmptyReferenceCard>
                        ) : (
                          month.dashboard.specialBudgetRows.map((row) => (
                            <article
                              key={row.id}
                              className="rounded-[1.4rem] border border-amber-200 bg-white/88 p-5 shadow-[0_14px_30px_rgba(146,64,14,0.06)]"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h4 className="text-base font-extrabold tracking-[-0.03em] text-[color:var(--month-ink)]">
                                    {row.name}
                                  </h4>
                                  <p className="mt-1 text-sm text-[color:var(--month-ink-soft)]">
                                    Ist {formatEuro(row.actualExpenseCents)} ·
                                    Rest {formatEuro(row.remainingAmountCents)}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${specialBudgetStatusTone(row)}`}
                                >
                                  {specialBudgetStatusLabel(row)}
                                </span>
                              </div>
                              <form
                                action={updateMonthlySpecialBudgetAction}
                                className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                              >
                                <input
                                  type="hidden"
                                  name="monthKey"
                                  value={month.monthKey}
                                />
                                <input
                                  type="hidden"
                                  name="specialBudgetId"
                                  value={row.id}
                                />
                                <input
                                  name="plannedAmount"
                                  inputMode="decimal"
                                  defaultValue={toInputAmount(
                                    row.plannedAmountCents,
                                  )}
                                  placeholder="z. B. 120.00"
                                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-[color:var(--month-ink)] focus:border-amber-400 focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5"
                                >
                                  Speichern
                                </button>
                              </form>
                              <form
                                action={updateMonthlySpecialBudgetStateAction}
                                className="mt-3"
                              >
                                <input
                                  type="hidden"
                                  name="monthKey"
                                  value={month.monthKey}
                                />
                                <input
                                  type="hidden"
                                  name="specialBudgetId"
                                  value={row.id}
                                />
                                {row.isActive ? (
                                  <button
                                    type="submit"
                                    name="intent"
                                    value="deactivate"
                                    className="text-xs font-bold text-amber-800 underline decoration-amber-300 underline-offset-4"
                                  >
                                    Sonderbudget deaktivieren
                                  </button>
                                ) : (
                                  <button
                                    type="submit"
                                    name="intent"
                                    value="reactivate"
                                    className="text-xs font-bold text-emerald-700 underline decoration-emerald-200 underline-offset-4"
                                  >
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
            {month.dashboard.categoryRows.length === 0 &&
            activeSpecialBudgetRows.length === 0 ? (
              <EmptyReferenceCard>
                Noch keine Budgettoepfe fuer diesen Monat vorhanden.
              </EmptyReferenceCard>
            ) : (
              <>
                {month.dashboard.categoryRows.map((row) => {
                  const category = categoryVisuals.get(row.categoryId);
                  const usageState = getCategoryUsageState(row);
                  const hasPlannedBudget =
                    row.budgetAmountCents !== null &&
                    row.budgetAmountCents > 0;

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
                                width: `${usageState.progressPercent}%`,
                                ...categoryUsageProgressStyle(usageState),
                              }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                            <span>
                              {!hasPlannedBudget
                                ? "Budget fehlt"
                                : `${usageState.percent}% genutzt`}
                            </span>
                            <span>
                              {!hasPlannedBudget
                                ? "Kein Planwert"
                                : `Plan ${formatEuro(row.budgetAmountCents ?? 0)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeSpecialBudgetRows.length > 0 ? (
                  <section className="pt-2">
                    <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-amber-700">
                      Sonderbudgets
                    </p>
                    <div className="mt-4 space-y-5">
                      {activeSpecialBudgetRows.map((row) => {
                        const usageState = getCategoryUsageState({
                          budgetAmountCents: row.plannedAmountCents,
                          spentAmountCents: row.actualExpenseCents,
                        });
                        const hasPlannedBudget = row.plannedAmountCents > 0;

                        return (
                          <div
                            key={row.id}
                            className="grid gap-3"
                          >
                            <div className="flex items-center gap-4">
                              <span className="category-visual-mark h-12 w-12 text-xs">
                                SB
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                                    {row.name}
                                  </p>
                                  <p className="shrink-0 text-sm font-extrabold text-[color:var(--month-ink)]">
                                    {formatEuro(row.actualExpenseCents)}
                                  </p>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/85">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${usageState.progressPercent}%`,
                                      ...categoryUsageProgressStyle(
                                        usageState,
                                      ),
                                    }}
                                  />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                                  <span>
                                    {!hasPlannedBudget
                                      ? "Budget fehlt"
                                      : `${usageState.percent}% genutzt`}
                                  </span>
                                  <span>
                                    {!hasPlannedBudget
                                      ? "Kein Planwert"
                                      : `Plan ${formatEuro(row.plannedAmountCents)}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </article>

        <article className="month-reference-panel min-w-0 overflow-hidden bg-white/82">
          <SectionHeader
            eyebrow="Letzte Bewegung"
            title="Letzte Ausgaben"
            aside={
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--month-ink)]">
                Top 5
              </span>
            }
          />

          <div className="mt-7 space-y-4">
            {recentExpenses.length === 0 ? (
              <EmptyReferenceCard>
                Keine Ausgaben fuer diesen Monat vorhanden.
              </EmptyReferenceCard>
            ) : (
              recentExpenses.map((transaction) => (
                <div
                  key={`${transaction.sourceType}-${transaction.id}`}
                  className="month-expense-row"
                >
                  <TransactionVisualMark
                    transaction={transaction}
                    categoryVisuals={categoryVisuals}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                      {transaction.displayName}
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

      <details
        id="monatsbuchungen"
        className="month-reference-panel month-disclosure min-w-0 overflow-hidden bg-white/78"
        open={isBookingEditMode || undefined}
      >
        <summary className="month-disclosure-summary">
          <span className="mt-2 block text-2xl font-extrabold tracking-[-0.045em] text-[color:var(--month-ink)]">
            Alle Monatsbuchungen
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <MonthChip tone="neutral">
              {month.transactions.length} Eintraege
            </MonthChip>
            <Link
              href={bookingEditHref(month.monthKey, isBookingEditMode)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--month-line-strong)] bg-white text-lg font-black text-[color:var(--month-ink)] shadow-[0_10px_22px_rgba(7,27,70,0.06)] transition hover:-translate-y-0.5"
              aria-label={
                isBookingEditMode
                  ? "Editiermodus fuer Monatsbuchungen beenden"
                  : "Editiermodus fuer Monatsbuchungen aktivieren"
              }
              title={isBookingEditMode ? "Fertig" : "Bearbeiten"}
            >
              <span aria-hidden="true">{isBookingEditMode ? "✓" : "✎"}</span>
            </Link>
            <span className="month-disclosure-chevron" aria-hidden="true">
              ›
            </span>
          </span>
        </summary>

        <div className="mt-6 space-y-2.5">
          {month.transactions.length === 0 ? (
            <EmptyReferenceCard>
              Keine Buchungen fuer diesen Monat vorhanden.
            </EmptyReferenceCard>
          ) : (
            month.transactions.map((transaction) => {
              const currentAssignment = transaction.categoryId
                ? `category:${transaction.categoryId}`
                : transaction.specialBudgetId
                  ? `specialBudget:${transaction.specialBudgetId}`
                  : "";
              const isManual = transaction.sourceType === "manual";
              const canEditAssignment =
                transaction.transactionType === "expense";

              return (
                <article
                  key={`${transaction.sourceType}-${transaction.id}`}
                  className="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--month-line)] bg-white/82 px-3.5 py-3 shadow-[0_8px_18px_rgba(7,27,70,0.025)] sm:px-4"
                >
                  <div className="month-booking-row-grid">
                    <div className="flex min-w-0 items-center">
                      <TransactionVisualMark
                        transaction={transaction}
                        categoryVisuals={categoryVisuals}
                      />
                    </div>
                    <h3
                      className="min-w-0 truncate text-base font-black tracking-[-0.035em] text-[color:var(--month-ink)] sm:text-lg"
                      title={
                        transaction.sourceType === "import"
                          ? transaction.description
                          : undefined
                      }
                    >
                      {transaction.displayName}
                    </h3>
                    <p className="text-sm font-extrabold tracking-[-0.015em] text-[color:var(--month-ink-soft)] sm:text-left">
                      {transaction.bookingDate}
                    </p>
                    <span
                      className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-black ${assignmentTone(transaction)}`}
                    >
                      <span className="truncate">
                        {assignmentChipLabel(transaction)}
                      </span>
                    </span>
                    <p
                      className={`shrink-0 text-left text-lg font-black tracking-[-0.045em] sm:text-right ${amountTone(transaction.amountCents)}`}
                    >
                      {formatEuro(transaction.amountCents)}
                    </p>
                  </div>

                  {isBookingEditMode ? (
                    <div className="mt-5 grid gap-4 rounded-[1.2rem] border border-[color:var(--month-line)] bg-[#f7fbfe] p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full border border-[color:var(--month-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                          {sourceLabel(transaction.sourceType)}
                        </span>
                        <span className="inline-flex rounded-full border border-[color:var(--month-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                          {transaction.destinationAccountName
                            ? `${transaction.accountName} -> ${transaction.destinationAccountName}`
                            : transaction.accountName}
                        </span>
                      </div>

                      {transaction.sourceType === "import" ? (
                        <div className="rounded-xl border border-[color:var(--month-line)] bg-white/80 px-3 py-2">
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                            Originaler Banktext
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                            {transaction.description}
                          </p>
                        </div>
                      ) : null}

                      {isManual ? (
                        <form
                          action={updateMonthlyManualTransactionAction}
                          className="grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="monthKey"
                            value={month.monthKey}
                          />
                          <input
                            type="hidden"
                            name="transactionId"
                            value={transaction.id}
                          />
                          <input
                            type="hidden"
                            name="effectiveMonthKey"
                            value={month.monthKey}
                          />
                          <input
                            type="hidden"
                            name="transactionType"
                            value={transaction.transactionType}
                          />
                          <input
                            type="hidden"
                            name="accountId"
                            value={transaction.accountId}
                          />
                          <input
                            type="hidden"
                            name="destinationAccountId"
                            value={transaction.destinationAccountId ?? ""}
                          />

                          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)_minmax(0,0.85fr)]">
                            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                              Datum
                              <input
                                type="date"
                                name="bookingDate"
                                defaultValue={transaction.bookingDate}
                                className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
                              />
                            </label>
                            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                              Name
                              <input
                                name="description"
                                defaultValue={transaction.description}
                                maxLength={140}
                                className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
                              />
                            </label>
                            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                              Betrag
                              <input
                                name="amount"
                                inputMode="decimal"
                                defaultValue={toTransactionAmountInput(
                                  transaction.amountCents,
                                )}
                                className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
                              />
                            </label>
                          </div>

                          {canEditAssignment ? (
                            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                              Budgetzuordnung
                              <select
                                name="assignment"
                                defaultValue={currentAssignment}
                                className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
                              >
                                <option value="">Zuordnen</option>
                                <optgroup label="Kategorien">
                                  {categoryOptions.map((category) => (
                                    <option
                                      key={category.id}
                                      value={`category:${category.id}`}
                                    >
                                      {category.iconName
                                        ? `${category.iconName} `
                                        : ""}
                                      {category.name}
                                    </option>
                                  ))}
                                </optgroup>
                                {specialBudgetOptions.length > 0 ? (
                                  <optgroup label="Sonderbudgets">
                                    {specialBudgetOptions.map((budget) => (
                                      <option
                                        key={budget.id}
                                        value={`specialBudget:${budget.id}`}
                                      >
                                        Sonderbudget · {budget.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                              </select>
                            </label>
                          ) : (
                            <input type="hidden" name="assignment" value="" />
                          )}

                          <button
                            type="submit"
                            className="w-fit rounded-xl bg-[color:var(--month-ink)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5"
                          >
                            Speichern
                          </button>
                        </form>
                      ) : canEditAssignment ? (
                        <form
                          action={updateMonthlyTransactionAssignmentAction}
                          className="grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="monthKey"
                            value={month.monthKey}
                          />
                          <input type="hidden" name="bookingEdit" value="1" />
                          <input
                            type="hidden"
                            name="transactionId"
                            value={transaction.id}
                          />
                          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                            Budgetzuordnung
                            <select
                              name="assignment"
                              defaultValue={currentAssignment}
                              className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
                            >
                              <option value="">Zuordnen</option>
                              <optgroup label="Kategorien">
                                {categoryOptions.map((category) => (
                                  <option
                                    key={category.id}
                                    value={`category:${category.id}`}
                                  >
                                    {category.iconName
                                      ? `${category.iconName} `
                                      : ""}
                                    {category.name}
                                  </option>
                                ))}
                              </optgroup>
                              {specialBudgetOptions.length > 0 ? (
                                <optgroup label="Sonderbudgets">
                                  {specialBudgetOptions.map((budget) => (
                                    <option
                                      key={budget.id}
                                      value={`specialBudget:${budget.id}`}
                                    >
                                      Sonderbudget · {budget.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ) : null}
                            </select>
                          </label>
                          <button
                            type="submit"
                            className="w-fit rounded-xl bg-[color:var(--month-ink)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5"
                          >
                            Zuordnung speichern
                          </button>
                        </form>
                      ) : (
                        <p className="text-sm font-semibold text-[color:var(--month-ink-soft)]">
                          Diese Buchung hat keine Budgetzuordnung und wird hier
                          nur lesbar angezeigt.
                        </p>
                      )}

                      {isManual ? (
                        <form
                          action={deleteMonthlyManualTransactionAction}
                          className="flex flex-wrap items-center gap-3 border-t border-[color:var(--month-line)] pt-3"
                        >
                          <input
                            type="hidden"
                            name="monthKey"
                            value={month.monthKey}
                          />
                          <input
                            type="hidden"
                            name="transactionId"
                            value={transaction.id}
                          />
                          <label className="flex items-center gap-2 text-xs font-semibold text-red-800">
                            <input
                              type="checkbox"
                              name="confirmDelete"
                              className="h-4 w-4 rounded border-red-300"
                            />
                            Loeschen bestaetigen
                          </label>
                          <button
                            type="submit"
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700 transition hover:-translate-y-0.5"
                          >
                            Buchung loeschen
                          </button>
                        </form>
                      ) : transaction.sourceType === "import" ? (
                        <form
                          action={deleteMonthlyImportedTransactionAction}
                          className="flex flex-wrap items-center gap-3 border-t border-[color:var(--month-line)] pt-3"
                        >
                          <input
                            type="hidden"
                            name="monthKey"
                            value={month.monthKey}
                          />
                          <input
                            type="hidden"
                            name="transactionId"
                            value={transaction.id}
                          />
                          <label className="flex items-center gap-2 text-xs font-semibold text-red-800">
                            <input
                              type="checkbox"
                              name="confirmDelete"
                              className="h-4 w-4 rounded border-red-300"
                            />
                            Import-Loeschen bestaetigen
                          </label>
                          <button
                            type="submit"
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700 transition hover:-translate-y-0.5"
                          >
                            Import-Buchung loeschen
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </details>
    </MonthPageShell>
  );
}
