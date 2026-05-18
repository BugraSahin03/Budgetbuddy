import { setMonthlyBudgetAction } from "@/app/budgets/actions";
import {
  getCurrentMonthKey,
  listMonthlyBudgetCategories,
} from "@/src/budgets/repository";

export const dynamic = "force-dynamic";

type BudgetsPageProps = {
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

function formatEuroFromCents(amountCents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function toInputAmount(amountCents: number | null): string {
  if (amountCents === null) {
    return "";
  }

  return (amountCents / 100).toFixed(2);
}

function budgetStateTone(remainingAmountCents: number | null): string {
  if (remainingAmountCents === null) {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  if (remainingAmountCents < 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (remainingAmountCents <= 1000) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function budgetStateLabel(remainingAmountCents: number | null): string {
  if (remainingAmountCents === null) {
    return "Budget fehlt";
  }

  if (remainingAmountCents < 0) {
    return "Ueber Budget";
  }

  if (remainingAmountCents <= 1000) {
    return "Nahe am Budget";
  }

  return "Im Rahmen";
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const monthFromQuery = toSingleParam(params.month);
  const selectedMonth = monthFromQuery ?? getCurrentMonthKey();
  const budgetRows = listMonthlyBudgetCategories(selectedMonth);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Monatsbudgets
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          Orientierungswerte fuer feste Kategorien
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Budgets blockieren keine Buchungen. Ueberschreitungen werden nur deutlich markiert.
        </p>
      </header>

      <form action="/budgets" method="get" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="month" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Monat auswaehlen
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={selectedMonth}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Anzeigen
          </button>
        </div>
      </form>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Kategorie</th>
              <th className="px-3 py-2 font-semibold">Budget</th>
              <th className="px-3 py-2 font-semibold">Ist</th>
              <th className="px-3 py-2 font-semibold">Rest</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgetRows.map((row) => (
              <tr key={row.categoryId}>
                <td className="px-3 py-3 font-medium text-slate-900">{row.categoryName}</td>
                <td className="px-3 py-3">
                  <form action={setMonthlyBudgetAction} className="flex min-w-[13rem] items-center gap-2">
                    <input type="hidden" name="monthKey" value={selectedMonth} />
                    <input type="hidden" name="categoryId" value={row.categoryId} />
                    <input
                      name="budgetAmount"
                      inputMode="decimal"
                      defaultValue={toInputAmount(row.budgetAmountCents)}
                      placeholder="z. B. 250.00"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-200"
                    >
                      Speichern
                    </button>
                  </form>
                </td>
                <td className="px-3 py-3 text-slate-700">{formatEuroFromCents(row.spentAmountCents)}</td>
                <td className="px-3 py-3 text-slate-700">
                  {row.remainingAmountCents === null
                    ? "-"
                    : formatEuroFromCents(row.remainingAmountCents)}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${budgetStateTone(row.remainingAmountCents)}`}
                  >
                    {budgetStateLabel(row.remainingAmountCents)}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {row.budgetAmountCents === null
                    ? "Noch kein Monatswert"
                    : "Monatsspezifischer Wert"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
