import { setCategoryDefaultBudgetAction } from "@/app/budgets/actions";
import { listCategoryBudgetDefaults } from "@/src/budgets/repository";

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

function toInputAmount(amountCents: number | null): string {
  if (amountCents === null) {
    return "";
  }

  return (amountCents / 100).toFixed(2);
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const budgetRows = listCategoryBudgetDefaults();

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Standardbudgets
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          Globale Orientierungswerte pro Kategorie
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Diese Seite pflegt den Standardwert je Kategorie. In der Monatsansicht kann derselbe Wert
          pro Monat bewusst ueberschrieben werden, ohne den Standard zu aendern.
        </p>
      </header>

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
              <th className="px-3 py-2 font-semibold">Standardwert</th>
              <th className="px-3 py-2 font-semibold">Monats-Overrides</th>
              <th className="px-3 py-2 font-semibold">Hinweis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgetRows.map((row) => (
              <tr key={row.categoryId}>
                <td className="px-3 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    <span>{row.categoryName}</span>
                    {!row.isCategoryActive ? (
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        inaktiv
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <form action={setCategoryDefaultBudgetAction} className="flex min-w-[14rem] items-center gap-2">
                    <input type="hidden" name="categoryId" value={row.categoryId} />
                    <input
                      name="budgetAmount"
                      inputMode="decimal"
                      defaultValue={toInputAmount(row.defaultBudgetAmountCents)}
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
                <td className="px-3 py-3 text-slate-700">{row.monthlyOverrideCount}</td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {row.defaultBudgetAmountCents === null
                    ? "Ohne Standardwert. Monate koennen trotzdem eigene Werte setzen."
                    : "Dient als Fallback, wenn im Monat kein eigener Override existiert."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
