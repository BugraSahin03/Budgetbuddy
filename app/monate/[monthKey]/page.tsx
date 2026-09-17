import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { CategoryVisualMark } from "@/app/components/category-visual";
import {
  closeMonthAction,
  dissolveMonthlySettlementAction,
  deleteMonthlyImportedTransactionAction,
  deleteMonthlyManualTransactionAction,
  reopenMonthAction,
  renameMonthlySettlementAction,
  reclassifyMonthlyIncomeDeductionAction,
  setMonthlyBudgetOverrideAction,
  updateMonthlyManualTransactionAction,
  updateMonthlySpecialBudgetAction,
  updateMonthlySpecialBudgetStateAction,
  updateMonthlySettlementAssignmentAction,
  updateMonthlyFixedCostControlOverrideAction,
  updateMonthlyTransactionAssignmentAction,
} from "@/app/monate/actions";
import { DirectAssignmentSelect } from "@/app/monate/[monthKey]/direct-assignment-select";
import { InlineDisplayNameEditor } from "@/app/monate/[monthKey]/display-name-inline-editor";
import {
  MonthBookingFilter,
  type MonthBookingFilterOption,
} from "@/app/monate/[monthKey]/month-booking-filter";
import { MonthCategoryOverview } from "@/app/monate/[monthKey]/month-category-overview";
import { MonthTodoDialog } from "@/app/monate/[monthKey]/month-todo-dialog";
import { SettlementDialog } from "@/app/monate/[monthKey]/settlement-dialog";
import { SettlementHistoryHighlighter } from "@/app/monate/[monthKey]/settlement-history-highlighter";
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
  type MonthFixedCostControlMatchRow,
  type MonthDetailTransactionRow,
} from "@/src/months/repository";
import {
  categoryUsageChipClassName,
  categoryUsageSurfaceStyle,
  getCategoryUsageState,
} from "@/src/months/category-usage";
import { getFixedCostVariance } from "@/src/months/fixed-cost-variance";
import {
  listActiveAccountOptions,
  listActiveCategoryOptions,
  listActiveSpecialBudgetOptionsForMonth,
} from "@/src/transactions/repository";
import { listMonthlyTodos } from "@/src/month-todos/repository";

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
    return "Rückerstattung";
  }

  if (type === "income_deduction") {
    return "Einkommensabzug";
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

  if (row.transactionType === "income_deduction") {
    return "Einkommensabzug";
  }

  return "Keine Zuordnung nötig";
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
    return `${row.specialBudgetName} · Sonderkategorie`;
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

function fixedCostControlReasonLabel(
  match: MonthFixedCostControlMatchRow,
): string {
  return match.controlLabel.replace(/^Fixkosten-Kontrolle:\s*/, "");
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
        name={transaction.categoryName ?? "Kategorie"}
        iconName={transaction.categoryIconName}
        colorHex={category?.colorHex}
        className="h-10 w-10 text-xs"
        variant="neutral"
      />
    );
  }

  if (transaction.specialBudgetId) {
    return (
      <CategoryVisualMark
        name={transaction.specialBudgetName ?? "Sonderkategorie"}
        iconName={transaction.specialBudgetIconName}
        className="h-10 w-10 text-xs"
        variant="neutral"
      />
    );
  }

  if (transaction.transactionType === "expense") {
    return (
      <span className="category-visual-mark h-10 w-10 border-red-200 bg-red-100 text-base text-red-700">
        ?
      </span>
    );
  }

  if (transaction.transactionType === "income_deduction") {
    return (
      <span className="category-visual-mark h-10 w-10 border-amber-200 bg-amber-50 text-sm text-amber-800">
        −
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

function transactionFilterToken(transaction: MonthDetailTransactionRow): string {
  if (transaction.transactionType !== "expense") {
    return "";
  }

  if (transaction.categoryId !== null) {
    return `category:${transaction.categoryId}`;
  }

  if (transaction.specialBudgetId !== null) {
    return `specialBudget:${transaction.specialBudgetId}`;
  }

  return "open";
}

function buildBookingFilterOptions({
  categories,
  specialBudgets,
  transactions,
}: {
  categories: { id: number; name: string }[];
  specialBudgets: { id: number; name: string }[];
  transactions: MonthDetailTransactionRow[];
}): MonthBookingFilterOption[] {
  let hasOpenExpenses = false;

  for (const transaction of transactions) {
    if (transaction.transactionType !== "expense") continue;

    if (transaction.categoryId === null && transaction.specialBudgetId === null) {
      hasOpenExpenses = true;
    }
  }

  return [
    ...categories.map((category) => ({
      label: category.name,
      token: `category:${category.id}`,
      tone: "category" as const,
    })),
    ...specialBudgets.map((budget) => ({
      label: `Sonderkategorie · ${budget.name}`,
      token: `specialBudget:${budget.id}`,
      tone: "specialBudget" as const,
    })),
    ...(hasOpenExpenses
      ? [
          {
            label: "Ohne Zuordnung",
            token: "open",
            tone: "open" as const,
          },
        ]
      : []),
  ];
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
    direction === "previous" ? "Vorheriger Monat" : "Nächster Monat";

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
  tone: "income" | "expense" | "savings" | "plan" | "cash";
  marker: string;
  action?: ReactNode;
  actionClassName?: string;
}) {
  const toneStyle: {
    marker: CSSProperties;
    value: CSSProperties;
  } = {
    income: {
      marker: { backgroundColor: "#8bf0df", color: "#055c52" },
      value: { color: "#08766b" },
    },
    expense: {
      marker: { backgroundColor: "#74171d", color: "#ffffff" },
      value: { color: "#f17680" },
    },
    savings: {
      marker: { backgroundColor: "#d9f7b5", color: "#365f08" },
      value: { color: "#4f7d12" },
    },
    plan: {
      marker: { backgroundColor: "#d7edf8", color: "var(--month-ink)" },
      value: { color: "var(--month-ink)" },
    },
    cash: {
      marker: { backgroundColor: "#e8f5d5", color: "#41620f" },
      value: { color: "#2f5f18" },
    },
  }[tone];

  return (
    <article className="month-reference-card month-reference-metric-card relative min-h-[10rem] p-6">
      <div
        className="month-reference-marker flex h-10 w-10 items-center justify-center rounded-2xl"
        style={toneStyle.marker}
      >
        <span className="text-lg font-bold leading-none">{marker}</span>
      </div>
      <p className="month-reference-label mt-5 text-sm font-semibold text-[color:var(--month-ink-soft)]">
        {label}
      </p>
      <p
        className="month-reference-value mt-2 text-[2rem] font-extrabold tracking-[-0.055em]"
        style={toneStyle.value}
      >
        {value}
      </p>
      <p className="month-reference-copy mt-2 text-xs font-medium text-[color:var(--month-ink-muted)]">
        {copy}
      </p>
      {action ? (
        <div className={actionClassName ?? "month-reference-card-action mt-4"}>
          {action}
        </div>
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

function MonthCloseControl({
  monthKey,
  isClosed,
  openAssignmentCount,
}: {
  monthKey: string;
  isClosed: boolean;
  openAssignmentCount: number;
}) {
  if (isClosed) {
    return (
      <MonthDialog
        eyebrow="Monatsstatus"
        title="Monat wieder öffnen"
        description="Nach dem Wiederöffnen können Buchungen, Zuordnungen und Importe wieder bearbeitet werden. Der Planstand aus Fixkosten, Kategorien und Sonderkategorien bleibt vom ersten Abschluss erhalten und wird nicht automatisch neu berechnet. Vorhandene Monatsbudgets bleiben eingefroren; fehlende Kategorien oder Sonderkategorien werden erst bei bewusster erster Verwendung ergänzt."
        triggerLabel="Wieder öffnen"
        triggerClassName="month-dialog-trigger"
      >
        <form action={reopenMonthAction} className="grid gap-5">
          <input type="hidden" name="monthKey" value={monthKey} />
          <label className="flex gap-3 rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/78 p-4 text-sm font-semibold leading-6 text-[color:var(--month-ink-soft)]">
            <input
              type="checkbox"
              name="confirmReopen"
              className="mt-1 h-4 w-4 rounded border-[color:var(--month-line-strong)]"
            />
            Ich möchte diesen Monat wieder öffnen und Bearbeitungen bewusst
            erlauben. Der Planstand vom ersten Abschluss bleibt erhalten.
          </label>
          <button
            type="submit"
            className="w-fit rounded-2xl bg-[color:var(--month-ink)] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5"
          >
            Wieder öffnen
          </button>
        </form>
      </MonthDialog>
    );
  }

  return (
    <MonthDialog
      eyebrow="Monatsstatus"
      title="Monat abschließen"
      description="Der Abschluss sperrt diesen Monat gegen versehentliche Änderungen. Offene Zuordnungen werden nur gewarnt, nicht hart blockiert."
      triggerLabel="Monat abschließen"
      triggerClassName="month-dialog-trigger"
    >
      <form action={closeMonthAction} className="grid gap-5">
        <input type="hidden" name="monthKey" value={monthKey} />
        <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/82 p-4 text-sm leading-6 text-amber-950">
          <p className="font-black">Vor dem Abschluss kurz prüfen</p>
          <p className="mt-2">
            {openAssignmentCount > 0
              ? `${openAssignmentCount} Ausgabe(n) sind noch offen zugeordnet. Du kannst trotzdem abschließen, wenn das fachlich passt.`
              : "Alle Ausgaben haben aktuell eine Kategorie- oder Sonderbudget-Zuordnung."}
          </p>
          <p className="mt-2">
            Gesperrt werden neue Buchungen, Buchungsbearbeitung, Importe,
            Kategoriezuordnungen, Monatsbudgets und Sonderbudget-Monatsanteile.
          </p>
        </div>
        <label className="flex gap-3 rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/78 p-4 text-sm font-semibold leading-6 text-[color:var(--month-ink-soft)]">
          <input
            type="checkbox"
            name="confirmClose"
            className="mt-1 h-4 w-4 rounded border-[color:var(--month-line-strong)]"
          />
          Ich habe die Hinweise geprüft und möchte den Monat abschließen.
        </label>
        <button
          type="submit"
          className="w-fit rounded-2xl bg-[color:var(--month-ink)] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5"
        >
          Monat abschließen
        </button>
      </form>
    </MonthDialog>
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
  const isFixedCostControlDialogOpen =
    toSingleParam(resolvedSearchParams.fixedCostControl) === "1";
  const month = getMonthDetail(monthKey);
  const fixedCostVariance = getFixedCostVariance(
    month.dashboard.totals.plannedFixedCostsCents,
    month.dashboard.totals.actualFixedCostsCents,
  );
  const allCategories = listCategories();
  const categoryVisuals = categoryVisualById(allCategories);
  const activeCategoryIds = new Set(
    allCategories
      .filter((category) => category.isActive)
      .map((category) => category.id),
  );
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
    .filter(
      (transaction) =>
        transaction.transactionType === "expense" &&
        transaction.settlementGroupId === null,
    )
    .slice(0, 5);
  const bookingFilterOptions = buildBookingFilterOptions({
    categories: categoryOptions,
    specialBudgets: specialBudgetOptions,
    transactions: month.transactions,
  });
  const activeSpecialBudgetRows = month.dashboard.specialBudgetRows.filter(
    (row) => row.isActive,
  );
  const monthlyTodos = listMonthlyTodos(month.monthKey);
  const isMonthClosed = month.status.status === "closed";
  const isReopenedHistoricalMonth =
    !isMonthClosed && month.status.hasBudgetSnapshot;
  const canEditMonth = !isMonthClosed;
  const canEditBookings = isBookingEditMode && canEditMonth;
  const openAssignmentCount = month.transactions.filter(
    (transaction) =>
      transaction.settlementGroupId === null &&
      transaction.transactionType === "expense" &&
      transaction.categoryId === null &&
      transaction.specialBudgetId === null,
  ).length + month.dashboard.settlementGroups.filter(
    (group) =>
      group.amountCents < 0 &&
      group.categoryId === null &&
      group.specialBudgetId === null,
  ).length;
  const settlementEligibleBookings = month.transactions
    .filter((transaction) => transaction.isSettlementEligible)
    .map((transaction) => ({
      id: transaction.id,
      bookingDate: transaction.bookingDate,
      displayName: transaction.displayName,
      amountCents: transaction.amountCents,
      accountName: transaction.accountName,
    }));

  return (
    <MonthPageShell>
      <section className="month-reference-hero">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="month-eyebrow">Monatsüberblick</p>
          <div className="month-reference-actions flex flex-wrap items-center justify-start gap-3 sm:justify-end">
            <MonthTodoDialog
              monthKey={month.monthKey}
              monthLabel={month.label}
              initialTodos={monthlyTodos}
            />
            {isMonthClosed ? (
              <MonthChip tone="neutral">Abgeschlossen</MonthChip>
            ) : null}
            {isReopenedHistoricalMonth ? (
              <MonthChip tone="accent">Wieder geöffnet</MonthChip>
            ) : null}
            {canEditMonth ? (
              <SettlementDialog
                monthKey={month.monthKey}
                monthLabel={month.label}
                bookings={settlementEligibleBookings}
              />
            ) : null}
            <MonthCloseControl
              monthKey={month.monthKey}
              isClosed={isMonthClosed}
              openAssignmentCount={openAssignmentCount}
            />
            {canEditMonth ? (
              <MonthActionOverlay
                monthKey={month.monthKey}
                monthLabel={month.label}
                accountOptions={accountOptions}
                categoryOptions={visualCategoryOptions}
                specialBudgetOptions={specialBudgetOptions}
                defaultAccountId={defaultAccountId}
              />
            ) : null}
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
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-start">
              <div>
                <p className="month-eyebrow">Aktueller Budgetstand</p>
                <p
                  className={`mt-3 text-[clamp(2.05rem,4.6vw,3.4rem)] font-black tracking-[-0.075em] ${budgetStandTone(month.dashboard.totals.currentBudgetCents)}`}
                >
                  {formatEuro(month.dashboard.totals.currentBudgetCents)}
                </p>
              </div>
              <div className="month-cash-inline">
                <span aria-hidden="true">€</span>
                <div>
                  <p>Bargeldbestand</p>
                  <strong>{formatEuro(month.dashboard.totals.cashBalanceCents)}</strong>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {warningCount > 0 ? (
        <section className="rounded-[1.7rem] border border-red-200 bg-[linear-gradient(135deg,rgba(254,242,242,0.98),rgba(255,255,255,0.94))] p-5 shadow-[0_16px_40px_rgba(185,28,28,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="month-eyebrow text-red-700">Warnbereich</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-red-950">
                {warningCount} Budgetüberschreitung(en) aktiv
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/80">
                Dieser Monat enthält mindestens eine klare Budgetwarnung und
                sollte zuerst auf Monatsseite geprüft werden.
              </p>
            </div>
            <MonthChip tone="warn">Bitte zuerst prüfen</MonthChip>
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

      {isMonthClosed ? (
        <section className="rounded-[1.7rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.94))] p-5 text-sm leading-6 text-sky-950 shadow-[0_16px_40px_rgba(7,27,70,0.06)]">
          <p className="month-eyebrow text-sky-700">Monat abgeschlossen</p>
          <p className="mt-2 font-semibold">
            Dieser Monat ist gegen neue Buchungen, Importe, Zuordnungen,
            Löschungen und Monatsbudget-Änderungen gesperrt. Zum Bearbeiten
            bitte bewusst wieder öffnen.
          </p>
        </section>
      ) : null}

      {isReopenedHistoricalMonth ? (
        <section className="rounded-[1.7rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,0.94))] p-5 text-sm leading-6 text-amber-950 shadow-[0_16px_40px_rgba(120,53,15,0.06)]">
          <p className="month-eyebrow text-amber-700">Monat wieder geöffnet</p>
          <p className="mt-2 font-semibold">
            Der Planstand vom ersten Abschluss bleibt erhalten. Globale
            Änderungen an Kategorien und Sonderkategorien werden hier nicht
            automatisch übernommen. Fehlende Einträge werden erst bei einer
            bewussten ersten Verwendung in diesem Monat ergänzt.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <ReferenceMetricCard
          label="Einnahmen"
          value={formatEuro(month.dashboard.totals.incomeCents)}
          copy={
            month.dashboard.totals.incomeDeductionCents > 0
              ? `Bruttoeinnahmen ${formatEuro(month.dashboard.totals.grossIncomeCents)} · Einkommensabzug -${formatEuro(month.dashboard.totals.incomeDeductionCents)}`
              : "Alle Einkommen und Rückerstattungen dieses Monats."
          }
          tone="income"
          marker="↙"
        />
        <ReferenceMetricCard
          label="Ausgaben"
          value={formatEuro(month.dashboard.totals.expenseCents)}
          copy="Variable Ausgaben ohne Sparen und separaten Fixkosten-Kontrollblock."
          tone="expense"
          marker="↗"
          actionClassName="month-reference-card-action absolute right-6 top-6"
          action={
            <MonthDialog
              eyebrow="Fixkostenkontrolle"
              title="Plan und Ist-Kontrolle"
              description="Die Kontrolle bleibt im Monatskontext erreichbar, nimmt aber keinen dauerhaften Platz in der Übersicht ein."
              triggerLabel="Fixkostenkontrolle"
              triggerClassName="month-dialog-trigger month-dialog-trigger-rose"
              initialOpen={isFixedCostControlDialogOpen}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.4rem] bg-[#eef8fd] p-5">
                  <p className="month-eyebrow">Fixkosten (Plan)</p>
                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                    {formatEuro(month.dashboard.totals.plannedFixedCostsCents)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">
                    {month.status.hasFixedCostSnapshot
                      ? "Eingefrorener Planstand aus dem ersten Monatsabschluss."
                      : "Aktueller Planstand aus der Fixkostenpflege."}
                  </p>
                </div>
                <div className="rounded-[1.4rem] bg-[#eef8fd] p-5">
                  <p className="month-eyebrow">Fixkosten (Ist)</p>
                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                    {formatEuro(month.dashboard.totals.actualFixedCostsCents)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">
                    {month.dashboard.totals.actualFixedCostsCents > 0
                      ? "Persistierte und manuell korrigierte Kontrolltreffer dieses Monats."
                      : "Aktuell kein Fixkosten-Kontrolltreffer in diesem Monat."}
                  </p>
                </div>
                <div
                  className={`rounded-[1.4rem] border p-5 ${
                    fixedCostVariance.state === "over-plan"
                      ? "border-rose-200 bg-rose-50"
                      : fixedCostVariance.state === "on-plan"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-sky-200 bg-sky-50"
                  }`}
                >
                  <p className="month-eyebrow">Differenz</p>
                  <p
                    className={`mt-3 text-3xl font-black tracking-[-0.055em] ${
                      fixedCostVariance.state === "over-plan"
                        ? "text-rose-700"
                        : fixedCostVariance.state === "on-plan"
                          ? "text-emerald-700"
                          : "text-sky-800"
                    }`}
                  >
                    {formatEuro(fixedCostVariance.amountCents)}
                  </p>
                  <p className="mt-3 text-sm font-bold leading-6 text-[color:var(--month-ink-soft)]">
                    {fixedCostVariance.label}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/80 p-5">
                  <p className="month-eyebrow">
                    Voraussichtlich nach Fixkostenplan
                  </p>
                  <p
                    className={`mt-3 text-3xl font-black tracking-[-0.055em] ${budgetStandTone(month.dashboard.totals.projectedAfterFixedCostsCents)}`}
                  >
                    {formatEuro(
                      month.dashboard.totals.projectedAfterFixedCostsCents,
                    )}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--month-ink-soft)]">
                    Projektion mit dem vollständigen Fixkostenplan des Monats.
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--month-ink-muted)]">
                    Die Projektion setzt eine vollständige Fixkostenkontrolle voraus.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/72 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="month-eyebrow">Kontrolltreffer</p>
                    <h3 className="mt-1 text-lg font-black tracking-[-0.035em] text-[color:var(--month-ink)]">
                      Erkannte Fixkosten-Buchungen
                    </h3>
                  </div>
                  <MonthChip tone="neutral">
                    {month.dashboard.fixedCostControlMatches.length} Treffer
                  </MonthChip>
                </div>

                <div className="mt-4 space-y-2">
                  {month.dashboard.fixedCostControlMatches.length === 0 ? (
                    <div className="rounded-[1.1rem] border border-dashed border-[color:var(--month-line-strong)] bg-[#f8fcfe] px-4 py-5 text-sm font-semibold text-[color:var(--month-ink-soft)]">
                      Keine Fixkosten-Kontrolltreffer in diesem Monat erkannt.
                    </div>
                  ) : (
                    month.dashboard.fixedCostControlMatches.map((match) => (
                      <article
                        key={match.transactionId}
                        className="rounded-[1.1rem] border border-[color:var(--month-line)] bg-[#f8fcfe] px-4 py-3"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                                {match.bookingDate}
                              </span>
                              <span className="rounded-full border border-[color:var(--month-line)] bg-white px-2.5 py-1 text-xs font-bold text-[color:var(--month-ink-soft)]">
                                {fixedCostControlReasonLabel(match)}
                              </span>
                              {match.controlSource === "manual" ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-sky-800">
                                  manuell
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 truncate text-sm font-black text-[color:var(--month-ink)]">
                              {match.displayName}
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--month-ink-soft)]">
                              {match.description}
                            </p>
                            {match.importRunId !== null ? (
                              <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                                Importlauf #{match.importRunId}
                              </p>
                            ) : null}
                          </div>
                          <div className="grid justify-items-start gap-2 lg:justify-items-end">
                            <p className="text-right text-lg font-black tracking-[-0.045em] text-[color:var(--month-ink)]">
                              {formatEuro(match.controlAmountCents)}
                            </p>
                            {canEditBookings ? (
                              <form
                                action={updateMonthlyFixedCostControlOverrideAction}
                              >
                                <input
                                  type="hidden"
                                  name="monthKey"
                                  value={month.monthKey}
                                />
                                <input
                                  type="hidden"
                                  name="transactionId"
                                  value={match.transactionId}
                                />
                                <input
                                  type="hidden"
                                  name="intent"
                                  value={
                                    match.controlSource === "manual"
                                      ? "clear"
                                      : "exclude"
                                  }
                                />
                                <button
                                  type="submit"
                                  className="rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-rose-800 shadow-[0_8px_18px_rgba(190,18,60,0.08)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100"
                                >
                                  Markierung entfernen
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
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
      </section>

      <section className="grid gap-7 xl:grid-cols-[1.08fr_1fr]">
        <article className="month-reference-panel bg-[#dff4fd]">
          <SectionHeader
            eyebrow="Kategorieübersicht"
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
                {canEditMonth ? (
                  <MonthDialog
                    eyebrow="Monatsarbeit"
                    title="Budgetpflege"
                    description="Kategorien und Sonderkategorien bleiben fachlich getrennt, werden aber gemeinsam im Monatskontext gepflegt."
                    triggerLabel="Budgetpflege"
                  >
                  <div className="grid gap-5">
                    <section>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="month-eyebrow">Kategorien</p>
                          <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-[color:var(--month-ink)]">
                            Kategorien
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
                          const usageState = getCategoryUsageState(row);
                          const isSavingsCategory = row.isSavingsCategory;
                          const canEditCategoryBudget =
                            !month.status.hasBudgetSnapshot &&
                            row.isCategoryActive &&
                            activeCategoryIds.has(row.categoryId);

                          return (
                            <article
                              key={row.categoryId}
                              className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-5 shadow-[0_14px_30px_rgba(7,27,70,0.045)]"
                              style={categoryUsageSurfaceStyle(usageState)}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 gap-3">
                                  <CategoryVisualMark
                                    name={row.categoryName}
                                    iconName={row.categoryIconName}
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
                              {!isSavingsCategory ? (
                                canEditCategoryBudget ? (
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
                                ) : (
                                  <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
                                    {month.status.hasBudgetSnapshot
                                      ? "Wieder geöffneter historischer Monatsstand · der Planstand vom ersten Abschluss bleibt erhalten."
                                      : "In diesem Monatsstand deaktivierte Kategorie · bestehende Buchungen bleiben sichtbar, ein Monatsbudget ist hier nicht editierbar."}
                                  </p>
                                )
                              ) : (
                                <p className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-bold leading-5 text-emerald-800">
                                  Sparen entsteht durch echte Buchungen und bekommt keinen Planbetrag.
                                </p>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-[1.7rem] border border-amber-200 bg-amber-50/70 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="month-eyebrow text-amber-700">
                            Sonderkategorien
                          </p>
                          <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-amber-950">
                            Monatsspezifische Ausgabenziele
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-amber-900/80">
                            Hell markiert, damit Sonderkategorien gemeinsam
                            erreichbar bleiben, aber nicht mit normalen
                            Kategorien verschmelzen.
                          </p>
                        </div>
                        <MonthChip tone="warn">
                          {month.dashboard.specialBudgetRows.length} Einträge
                        </MonthChip>
                      </div>
                      <div className="mt-5 space-y-4">
                        {month.dashboard.specialBudgetRows.length === 0 ? (
                          <EmptyReferenceCard>
                            Keine Sonderkategorien für diesen Monat vorhanden.
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
                              {month.status.hasBudgetSnapshot ? (
                                <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-bold leading-5 text-amber-900">
                                  Historischer Monatsstand · Betrag und
                                  Aktivstatus dieser Sonderkategorie sind
                                  eingefroren.
                                </p>
                              ) : (
                                <>
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
                                        Sonderkategorie deaktivieren
                                      </button>
                                    ) : (
                                      <button
                                        type="submit"
                                        name="intent"
                                        value="reactivate"
                                        className="text-xs font-bold text-emerald-700 underline decoration-emerald-200 underline-offset-4"
                                      >
                                        Sonderkategorie reaktivieren
                                      </button>
                                    )}
                                  </form>
                                </>
                              )}
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                  </MonthDialog>
                ) : (
                  <MonthChip tone="neutral">Budgetpflege gesperrt</MonthChip>
                )}
              </div>
            }
          />

          <div className="mt-7 space-y-5">
            <MonthCategoryOverview
              categoryRows={month.dashboard.categoryRows}
              planRestAfterBudgetPotsCents={
                month.dashboard.planSummary.planRestAfterBudgetPotsCents
              }
              specialBudgetRows={activeSpecialBudgetRows}
            />
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
                Keine Ausgaben für diesen Monat vorhanden.
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
                    <p className="month-expense-title truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                      {transaction.displayName}
                    </p>
                    <p className="month-expense-subtitle mt-1 truncate text-xs font-semibold text-[color:var(--month-ink-soft)]">
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
        open={canEditBookings || undefined}
      >
        <summary className="month-disclosure-summary">
          <span className="mt-2 block text-2xl font-extrabold tracking-[-0.045em] text-[color:var(--month-ink)]">
            Alle Monatsbuchungen
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <MonthChip tone="neutral">
              {month.transactions.length + month.dashboard.settlementGroups.length} Einträge
            </MonthChip>
            {canEditMonth ? (
              <Link
                href={bookingEditHref(month.monthKey, isBookingEditMode)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--month-line-strong)] bg-white text-lg font-black text-[color:var(--month-ink)] shadow-[0_10px_22px_rgba(7,27,70,0.06)] transition hover:-translate-y-0.5"
                aria-label={
                  isBookingEditMode
                    ? "Editiermodus für Monatsbuchungen beenden"
                    : "Editiermodus für Monatsbuchungen aktivieren"
                }
                title={isBookingEditMode ? "Fertig" : "Bearbeiten"}
              >
                <span aria-hidden="true">
                  {isBookingEditMode ? "✓" : "✎"}
                </span>
              </Link>
            ) : (
              <MonthChip tone="neutral">Gesperrt</MonthChip>
            )}
            <span className="month-disclosure-chevron" aria-hidden="true">
              ›
            </span>
          </span>
        </summary>

        <SettlementHistoryHighlighter>
        <div className="mt-6 space-y-2.5">
          {month.transactions.length === 0 ? (
            <EmptyReferenceCard>
              Keine Buchungen für diesen Monat vorhanden.
            </EmptyReferenceCard>
          ) : (
            <>
              <MonthBookingFilter
                options={bookingFilterOptions}
                totalCount={month.transactions.length + month.dashboard.settlementGroups.length}
              />
              {month.dashboard.settlementGroups.map((group) => {
                const currentAssignment = group.categoryId
                  ? `category:${group.categoryId}`
                  : group.specialBudgetId
                    ? `specialBudget:${group.specialBudgetId}`
                    : "";
                return (
                  <article
                    key={`settlement-${group.id}`}
                    data-month-booking-row
                    data-booking-filter-tokens={
                      group.categoryId
                        ? `category:${group.categoryId}`
                        : group.specialBudgetId
                          ? `specialBudget:${group.specialBudgetId}`
                          : group.amountCents < 0
                            ? "open"
                            : ""
                    }
                    className="min-w-0 overflow-hidden rounded-[1rem] border border-sky-200 bg-sky-50/80 px-3.5 py-3 shadow-[0_8px_18px_rgba(7,27,70,0.04)] sm:px-4"
                  >
                    <div className="month-booking-row-grid">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-white text-sm font-black text-sky-800">
                        ⇄
                      </div>
                      <button
                        type="button"
                        data-settlement-focus-trigger={String(group.id)}
                        aria-pressed="false"
                        className="month-settlement-focus-trigger min-w-0 rounded-xl px-2 py-1 text-left transition"
                        title="Zugehörige Buchungen hervorheben"
                      >
                        <h3 className="truncate text-base font-black tracking-[-0.035em] text-[color:var(--month-ink)] sm:text-lg">
                          {group.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-bold text-sky-800">
                          Verrechnungsergebnis · {group.memberCount} Buchungen · Anklicken zum Hervorheben
                        </p>
                      </button>
                      <p className="month-booking-date text-sm font-extrabold text-[color:var(--month-ink-soft)]">
                        {group.bookingDate}
                      </p>
                      <span className={`month-booking-assignment inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-black ${
                        group.amountCents < 0
                          ? group.specialBudgetId !== null
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : group.categoryId !== null
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-red-200 bg-red-50 text-red-700"
                          : "border-sky-200 bg-white text-sky-800"
                      }`}>
                        {group.amountCents < 0
                          ? group.specialBudgetName
                            ? `${group.specialBudgetName} · Sonderkategorie`
                            : group.categoryName ?? "Zuordnen"
                          : group.amountCents > 0
                            ? "Einnahme"
                            : "Neutral"}
                      </span>
                      <p className={`month-booking-amount text-lg font-black tracking-[-0.045em] sm:text-right ${amountTone(group.amountCents)}`}>
                        {formatEuro(group.amountCents)}
                      </p>
                    </div>

                    {canEditBookings ? (
                      <div className="mt-4 grid gap-4 rounded-[1.2rem] border border-sky-200 bg-white/80 p-4">
                        <form action={renameMonthlySettlementAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <input type="hidden" name="monthKey" value={month.monthKey} />
                          <input type="hidden" name="settlementId" value={group.id} />
                          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                            Name der Verrechnung
                            <input
                              name="name"
                              defaultValue={group.name}
                              minLength={2}
                              maxLength={80}
                              required
                              className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
                            />
                          </label>
                          <button type="submit" className="w-fit rounded-xl bg-sky-800 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                            Namen speichern
                          </button>
                        </form>
                        {group.amountCents < 0 ? (
                          <form action={updateMonthlySettlementAssignmentAction} className="grid gap-3">
                            <input type="hidden" name="monthKey" value={month.monthKey} />
                            <input type="hidden" name="settlementId" value={group.id} />
                            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
                              Ergebnis zuordnen
                              <select name="assignment" defaultValue={currentAssignment} className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]">
                                <option value="">Ohne Zuordnung</option>
                                <optgroup label="Kategorien">
                                  {categoryOptions.filter((category) => category.name !== "Sparen").map((category) => (
                                    <option key={category.id} value={`category:${category.id}`}>
                                      {category.iconName ? `${category.iconName} ` : ""}{category.name}
                                    </option>
                                  ))}
                                </optgroup>
                                {specialBudgetOptions.length > 0 ? (
                                  <optgroup label="Sonderkategorien">
                                    {specialBudgetOptions.map((budget) => (
                                      <option key={budget.id} value={`specialBudget:${budget.id}`}>
                                        {budget.iconName ? `${budget.iconName} ` : ""}Sonderkategorie · {budget.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                              </select>
                            </label>
                            <button type="submit" className="w-fit rounded-xl bg-[color:var(--month-ink)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                              Zuordnung speichern
                            </button>
                          </form>
                        ) : null}
                        <form action={dissolveMonthlySettlementAction} className="flex flex-wrap items-center gap-3 border-t border-sky-100 pt-3">
                          <input type="hidden" name="monthKey" value={month.monthKey} />
                          <input type="hidden" name="settlementId" value={group.id} />
                          <label className="flex items-center gap-2 text-xs font-semibold text-red-800">
                            <input type="checkbox" name="confirmDissolve" className="h-4 w-4" />
                            Auflösen bestätigen
                          </label>
                          <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700">
                            Verrechnung auflösen
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {month.transactions.map((transaction) => {
              const currentAssignment = transaction.categoryId
                ? `category:${transaction.categoryId}`
                : transaction.specialBudgetId
                  ? `specialBudget:${transaction.specialBudgetId}`
                  : "";
              const isManual = transaction.sourceType === "manual";
              const isSettled = transaction.settlementGroupId !== null;
              const canEditAssignment =
                transaction.transactionType === "expense" && !isSettled;
              const canDirectlyEditAssignment =
                canEditMonth && canEditAssignment && !canEditBookings;
              const hasAssignment = currentAssignment.length > 0;

              return (
                <article
                  key={`${transaction.sourceType}-${transaction.id}`}
                  data-month-booking-row
                  data-booking-filter-tokens={transactionFilterToken(
                    transaction,
                  )}
                  data-settlement-group-id={
                    transaction.settlementGroupId ?? undefined
                  }
                  className={`min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--month-line)] px-3.5 py-3 shadow-[0_8px_18px_rgba(7,27,70,0.025)] sm:px-4 ${isSettled ? "bg-slate-50/75 opacity-60" : "bg-white/82"}`}
                >
                  <div className="month-booking-row-grid">
                    <div
                      className="flex min-w-0 items-center"
                      data-month-booking-visual
                    >
                      <TransactionVisualMark
                        transaction={transaction}
                        categoryVisuals={categoryVisuals}
                      />
                    </div>
                    {canEditBookings && !isSettled ? (
                      <InlineDisplayNameEditor
                        monthKey={month.monthKey}
                        transactionId={transaction.id}
                        sourceType={transaction.sourceType}
                        displayName={transaction.displayName}
                        displayNameOverride={transaction.displayNameOverride}
                        originalDescription={
                          transaction.sourceType === "import"
                            ? transaction.description
                            : undefined
                        }
                      />
                    ) : (
                      <div className="min-w-0">
                      <h3
                        className="month-booking-title min-w-0 truncate text-base font-black tracking-[-0.035em] text-[color:var(--month-ink)] sm:text-lg"
                        title={
                          transaction.sourceType === "import"
                            ? transaction.description
                            : undefined
                        }
                      >
                        {transaction.displayName}
                      </h3>
                      {isSettled ? (
                        <p className="mt-0.5 truncate text-xs font-black text-slate-600">
                          Verrechnet · {transaction.settlementName}
                        </p>
                      ) : null}
                      </div>
                    )}
                    <p className="month-booking-date text-sm font-extrabold tracking-[-0.015em] text-[color:var(--month-ink-soft)] sm:text-left">
                      {transaction.bookingDate}
                    </p>
                    {canDirectlyEditAssignment ? (
                      <span className="month-booking-assignment min-w-0">
                        <DirectAssignmentSelect
                          amountCents={transaction.amountCents}
                          currentAssignment={currentAssignment}
                          currentAssignmentLabel={assignmentChipLabel(
                            transaction,
                          )}
                          hasAssignment={hasAssignment}
                          monthKey={month.monthKey}
                          transactionId={transaction.id}
                          categoryOptions={visualCategoryOptions}
                          specialBudgetOptions={specialBudgetOptions}
                        />
                      </span>
                    ) : (
                      <span
                        className={`month-booking-assignment inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-black ${assignmentTone(transaction)}`}
                        data-month-booking-assignment-label
                      >
                        <span className="truncate">
                          {assignmentChipLabel(transaction)}
                        </span>
                      </span>
                    )}
                    <p
                      className={`month-booking-amount shrink-0 text-left text-lg font-black tracking-[-0.045em] sm:text-right ${amountTone(transaction.amountCents)}`}
                    >
                      {formatEuro(transaction.amountCents)}
                    </p>
                  </div>

                  {canEditBookings && !isSettled ? (
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
                        {transaction.isFixedCostControlCandidate ? (
                          <form
                            action={updateMonthlyFixedCostControlOverrideAction}
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
                            <input type="hidden" name="intent" value="include" />
                            <button
                              type="submit"
                              className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-800 transition hover:-translate-y-0.5 hover:border-rose-200"
                            >
                              Als Fixkosten markieren
                            </button>
                          </form>
                        ) : null}
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
                              Beschreibung
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
                              Kategoriezuordnung
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
                                  <optgroup label="Sonderkategorien">
                                    {specialBudgetOptions.map((budget) => (
                                      <option
                                        key={budget.id}
                                        value={`specialBudget:${budget.id}`}
                                      >
                                        {budget.iconName
                                          ? `${budget.iconName} `
                                          : ""}
                                        Sonderkategorie · {budget.name}
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
                      ) : (
                        <>
                          {canEditAssignment ? (
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
                                Kategoriezuordnung
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
                                    <optgroup label="Sonderkategorien">
                                      {specialBudgetOptions.map((budget) => (
                                        <option
                                          key={budget.id}
                                          value={`specialBudget:${budget.id}`}
                                        >
                                          {budget.iconName
                                            ? `${budget.iconName} `
                                            : ""}
                                          Sonderkategorie · {budget.name}
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
                              Diese Buchung hat keine Kategoriezuordnung und wird hier
                              nur lesbar angezeigt.
                            </p>
                          )}
                        </>
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
                            Löschen bestätigen
                          </label>
                          <button
                            type="submit"
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700 transition hover:-translate-y-0.5"
                          >
                            Buchung löschen
                          </button>
                        </form>
                      ) : transaction.sourceType === "import" ? (
                        <div className="space-y-3 border-t border-[color:var(--month-line)] pt-3">
                          {transaction.transactionType === "income_deduction" ? (
                            <form
                              action={reclassifyMonthlyIncomeDeductionAction}
                              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
                            >
                              <input type="hidden" name="monthKey" value={month.monthKey} />
                              <input type="hidden" name="transactionId" value={transaction.id} />
                              <label className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                                <input type="checkbox" name="confirmReclassify" className="h-4 w-4 rounded border-amber-300" />
                                Rücknahme bestätigen
                              </label>
                              <button type="submit" className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-900 transition hover:-translate-y-0.5">
                                Als normale Ausgabe behandeln
                              </button>
                            </form>
                          ) : null}
                          <form
                            action={deleteMonthlyImportedTransactionAction}
                            className="flex flex-wrap items-center gap-3"
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
                            Import-Löschen bestätigen
                          </label>
                          <button
                            type="submit"
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700 transition hover:-translate-y-0.5"
                          >
                            Import-Buchung löschen
                          </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
              })}
            </>
          )}
        </div>
        </SettlementHistoryHighlighter>
      </details>
    </MonthPageShell>
  );
}
