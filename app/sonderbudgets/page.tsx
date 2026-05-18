import {
  createSpecialBudgetAction,
  updateSpecialBudgetStateAction,
} from "@/app/sonderbudgets/actions";
import {
  getSelectableMonthKeys,
  listActiveSpecialBudgetOptions,
  listSpecialBudgets,
} from "@/src/special-budgets/repository";

export const dynamic = "force-dynamic";

type SpecialBudgetsPageProps = {
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
  const [rawYear, rawMonth] = monthKey.split("-");
  const year = Number.parseInt(rawYear, 10);
  const month = Number.parseInt(rawMonth, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }

  const date = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function toBudgetStatusTone(isActive: boolean, remainingCents: number): string {
  if (!isActive) {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  if (remainingCents < 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (remainingCents === 0) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function toBudgetStatusLabel(isActive: boolean, remainingCents: number): string {
  if (!isActive) {
    return "Inaktiv";
  }

  if (remainingCents < 0) {
    return "Ueberschritten";
  }

  if (remainingCents === 0) {
    return "Ausgereizt";
  }

  return "Im Rahmen";
}

export default async function SpecialBudgetsPage({
  searchParams,
}: SpecialBudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const selectableMonths = getSelectableMonthKeys();
  const selectedMonthKey =
    toSingleParam(params.monthKey) ??
    selectableMonths[0] ??
    new Date().toISOString().slice(0, 7);

  const specialBudgets = listSpecialBudgets();
  const assignableSpecialBudgets = listActiveSpecialBudgetOptions(selectedMonthKey);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Sonderbudgets
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          Monatliche Sonderausgaben verwalten
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Sonderbudgets sind konkrete Monatsziele fuer Ausgaben und werden getrennt von festen
          Kategorien gefuehrt.
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

      <form
        action={createSpecialBudgetAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5"
      >
        <div className="xl:col-span-2">
          <label
            className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
            htmlFor="new-name"
          >
            Name
          </label>
          <input
            id="new-name"
            name="name"
            required
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
            placeholder="Raspberry Pi"
          />
        </div>

        <div>
          <label
            className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
            htmlFor="new-month"
          >
            Aktiver Monat
          </label>
          <select
            id="new-month"
            name="monthKey"
            required
            defaultValue={selectedMonthKey}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
          >
            {selectableMonths.map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {formatMonthLabel(monthKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
            htmlFor="new-amount"
          >
            Geplant (EUR)
          </label>
          <input
            id="new-amount"
            name="plannedAmount"
            required
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
            placeholder="120,00"
          />
        </div>

        <div className="xl:col-span-4">
          <label
            className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
            htmlFor="new-note"
          >
            Notiz (optional)
          </label>
          <input
            id="new-note"
            name="note"
            maxLength={240}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
            placeholder="Optionaler Kontext zur geplanten Ausgabe"
          />
        </div>

        <div className="flex items-end xl:col-span-1">
          <button
            type="submit"
            className="w-full rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200"
          >
            Sonderbudget erstellen
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Zuordnung fuer Ausgaben
            </p>
            <h3 className="text-sm font-semibold text-slate-900">
              Nur Sonderbudgets in aktiven Monaten sind auswaehlbar
            </h3>
          </div>
          <form method="get" className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="month-filter">
              Monat
            </label>
            <select
              id="month-filter"
              name="monthKey"
              defaultValue={selectedMonthKey}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
            >
              {selectableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Anzeigen
            </button>
          </form>
        </div>

        {assignableSpecialBudgets.length === 0 ? (
          <p className="pt-3 text-sm text-slate-600">
            Fuer {formatMonthLabel(selectedMonthKey)} sind aktuell keine aktiven Sonderbudgets
            vorhanden.
          </p>
        ) : (
          <ul className="space-y-2 pt-3">
            {assignableSpecialBudgets.map((budget) => (
              <li
                key={budget.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-900">{budget.name}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  auswaehlbar
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Monat</th>
              <th className="px-3 py-2 font-semibold">Geplant</th>
              <th className="px-3 py-2 font-semibold">Ist</th>
              <th className="px-3 py-2 font-semibold">Rest</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {specialBudgets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-600">
                  Noch keine Sonderbudgets vorhanden.
                </td>
              </tr>
            ) : (
              specialBudgets.map((budget) => {
                const remainingCents = budget.plannedAmountCents - budget.actualExpenseCents;
                const statusLabel = toBudgetStatusLabel(budget.isActive, remainingCents);
                const statusTone = toBudgetStatusTone(budget.isActive, remainingCents);

                return (
                  <tr key={budget.id}>
                    <td className="px-3 py-2 font-medium text-slate-900">{budget.name}</td>
                    <td className="px-3 py-2 text-slate-700">{formatMonthLabel(budget.monthKey)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatEuro(budget.plannedAmountCents)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatEuro(budget.actualExpenseCents)}
                    </td>
                    <td className={remainingCents < 0 ? "px-3 py-2 font-semibold text-red-700" : "px-3 py-2 text-slate-700"}>
                      {formatEuro(remainingCents)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <form action={updateSpecialBudgetStateAction}>
                        <input type="hidden" name="specialBudgetId" value={budget.id} />
                        {budget.isActive ? (
                          <button
                            type="submit"
                            name="intent"
                            value="deactivate"
                            className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Deaktivieren
                          </button>
                        ) : (
                          <button
                            type="submit"
                            name="intent"
                            value="reactivate"
                            className="rounded-lg border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                          >
                            Reaktivieren
                          </button>
                        )}
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
