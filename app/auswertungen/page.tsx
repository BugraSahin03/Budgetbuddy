import { getCategoryReport, listCategoryReportAvailableMonths } from "@/src/analytics/category-report";

export const dynamic = "force-dynamic";

type CategoryReportsPageProps = {
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

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatMonthLabel(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);

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

function statusTone(budgetAmountCents: number | null, remainingAmountCents: number | null): string {
  if (budgetAmountCents === null || remainingAmountCents === null) {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  if (remainingAmountCents < 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (remainingAmountCents === 0) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusLabel(budgetAmountCents: number | null, remainingAmountCents: number | null): string {
  if (budgetAmountCents === null || remainingAmountCents === null) {
    return "Budget fehlt";
  }

  if (remainingAmountCents < 0) {
    return "Ueber Budget";
  }

  if (remainingAmountCents === 0) {
    return "Ausgereizt";
  }

  return "Im Rahmen";
}

export default async function CategoryReportsPage({ searchParams }: CategoryReportsPageProps) {
  const params = (await searchParams) ?? {};
  const error = toSingleParam(params.error);

  const availableMonths = listCategoryReportAvailableMonths();
  const defaultMonthFrom = availableMonths[0] ?? new Date().toISOString().slice(0, 7);
  const defaultMonthTo = availableMonths[availableMonths.length - 1] ?? defaultMonthFrom;

  const selectedMonthFrom = toSingleParam(params.monthFrom) ?? defaultMonthFrom;
  const selectedMonthTo = toSingleParam(params.monthTo) ?? defaultMonthTo;

  let reportError: string | null = error;
  let report = null as ReturnType<typeof getCategoryReport> | null;

  try {
    report = getCategoryReport(selectedMonthFrom, selectedMonthTo);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error && caughtError.message.trim().length > 0
        ? caughtError.message
        : "Auswertung konnte nicht geladen werden.";
    reportError = message;
    report = getCategoryReport(defaultMonthFrom, defaultMonthTo);
  }

  const maxSeriesCents =
    report.chartSeries.length === 0
      ? 0
      : Math.max(...report.chartSeries.map((series) => series.totalSpentCents));

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Auswertungen</p>
        <h2 className="text-lg font-semibold text-slate-900">Kategorie-Auswertung</h2>
        <p className="mt-1 text-sm text-slate-600">
          Monatliche Kategorie-Summen inkl. Budgetvergleich fuer den gewaehlten Zeitraum.
        </p>
      </header>

      <form method="get" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="month-from">
            Von (Monat)
          </label>
          <select id="month-from" name="monthFrom" defaultValue={report.monthFrom} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {availableMonths.map((monthKey) => (
              <option key={`from-${monthKey}`} value={monthKey}>
                {formatMonthLabel(monthKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="month-to">
            Bis (Monat)
          </label>
          <select id="month-to" name="monthTo" defaultValue={report.monthTo} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {availableMonths.map((monthKey) => (
              <option key={`to-${monthKey}`} value={monthKey}>
                {formatMonthLabel(monthKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-end">
          <button type="submit" className="rounded-lg border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200">
            Zeitraum filtern
          </button>
        </div>
      </form>

      {reportError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reportError}</p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Diagramm: Ausgaben je Kategorie (Zeitraum)</h3>

        {report.chartSeries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Keine Kategorie-Ausgaben im gewaehlten Zeitraum.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.chartSeries.map((series) => {
              const widthPercent =
                maxSeriesCents <= 0 ? 0 : Math.max(6, Math.round((series.totalSpentCents / maxSeriesCents) * 100));

              return (
                <li key={series.categoryId} className="grid grid-cols-[180px_1fr_110px] items-center gap-3 text-sm">
                  <span className="font-medium text-slate-800">{series.categoryName}</span>
                  <div className="h-4 rounded bg-slate-100">
                    <div className="h-4 rounded bg-sky-500" style={{ width: `${widthPercent}%` }} />
                  </div>
                  <span className="text-right text-slate-700">{formatEuro(series.totalSpentCents)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Monat</th>
              <th className="px-3 py-2 font-semibold">Kategorie</th>
              <th className="px-3 py-2 font-semibold">Budget</th>
              <th className="px-3 py-2 font-semibold">Ist</th>
              <th className="px-3 py-2 font-semibold">Rest</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-600">
                  Keine Daten im gewaehlten Zeitraum.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr key={`${row.monthKey}-${row.categoryId}`}>
                  <td className="px-3 py-2 text-slate-700">{formatMonthLabel(row.monthKey)}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.categoryName}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.budgetAmountCents === null ? "-" : formatEuro(row.budgetAmountCents)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatEuro(row.spentAmountCents)}</td>
                  <td className={row.remainingAmountCents !== null && row.remainingAmountCents < 0 ? "px-3 py-2 font-semibold text-red-700" : "px-3 py-2 text-slate-700"}>
                    {row.remainingAmountCents === null ? "-" : formatEuro(row.remainingAmountCents)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(row.budgetAmountCents, row.remainingAmountCents)}`}>
                      {statusLabel(row.budgetAmountCents, row.remainingAmountCents)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
