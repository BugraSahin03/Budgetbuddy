import {
  createFixedCostAction,
  updateFixedCostAction,
  updateFixedCostAssignmentAction,
} from "@/app/fixkosten/actions";
import {
  getFixedCostsSummary,
  listExpenseTransactionsForFixedCostAssignment,
  listFixedCosts,
} from "@/src/fixed-costs/repository";

export const dynamic = "force-dynamic";

type FixedCostsPageProps = {
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

function formatBookingDay(day: number | null): string {
  if (!day) return "untermonatlich";
  return `${day}. des Monats`;
}

function rowStatusTone(isActive: boolean): string {
  if (!isActive) {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function rowStatusLabel(isActive: boolean): string {
  return isActive ? "Aktiv" : "Inaktiv";
}

export default async function FixedCostsPage({ searchParams }: FixedCostsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const fixedCosts = listFixedCosts();
  const summary = getFixedCostsSummary();
  const assignmentRows = listExpenseTransactionsForFixedCostAssignment();
  const activeFixedCosts = fixedCosts.filter((row) => row.isActive);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fixkosten</p>
        <h2 className="text-lg font-semibold text-slate-900">Fixkostenliste pflegen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fixkosten werden separat gepflegt und als geplanter Monatsblock gefuehrt.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Aktive Fixkosten</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.activeCount}</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Geplanter Monatsblock</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatEuro(summary.plannedTotalCents)}</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Markierte Ausgaben</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {assignmentRows.filter((row) => row.fixedCostId !== null).length}
          </p>
        </article>
      </section>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <form
        action={createFixedCostAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-12"
      >
        <div className="xl:col-span-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-name">
            Name
          </label>
          <input id="new-name" name="name" required maxLength={80} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Fitness Studio" />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-amount">
            Betrag (EUR)
          </label>
          <input id="new-amount" name="plannedAmount" required inputMode="decimal" placeholder="34,90" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-booking-day">
            Abbuchungstag
          </label>
          <input id="new-booking-day" name="bookingDayOfMonth" inputMode="numeric" placeholder="1-31 oder leer" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-payment-note">
            Abbuchungsinfo
          </label>
          <input id="new-payment-note" name="paymentNote" maxLength={60} placeholder="SEPA Lastschrift" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-note">
            Notiz
          </label>
          <input id="new-note" name="note" maxLength={240} placeholder="Optional" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-1 flex items-end">
          <button type="submit" className="w-full rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200">
            Erstellen
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Betrag</th>
              <th className="px-3 py-2 font-semibold">Abbuchung</th>
              <th className="px-3 py-2 font-semibold">Abbuchungsinfo</th>
              <th className="px-3 py-2 font-semibold">Notiz</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fixedCosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-600">
                  Noch keine Fixkosten vorhanden.
                </td>
              </tr>
            ) : (
              fixedCosts.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                  <td className="px-3 py-2 text-slate-700">{formatEuro(row.plannedAmountCents)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatBookingDay(row.bookingDayOfMonth)}</td>
                  <td className="px-3 py-2 text-slate-700">{row.paymentNote ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.note ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${rowStatusTone(row.isActive)}`}>
                      {rowStatusLabel(row.isActive)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <form action={updateFixedCostAction}>
                        <input type="hidden" name="fixedCostId" value={row.id} />
                        <input type="hidden" name="intent" value={row.isActive ? "deactivate" : "reactivate"} />
                        <button
                          type="submit"
                          className={row.isActive
                            ? "rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                            : "rounded border border-emerald-300 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"}
                        >
                          {row.isActive ? "Deaktivieren" : "Reaktivieren"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 border-b border-slate-100 pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Transaktions-Markierung</p>
          <h3 className="text-sm font-semibold text-slate-900">Manuelle Zuordnung fuer `wirkt_fuer_monat` (YYYY-MM)</h3>
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Datum</th>
              <th className="px-3 py-2 font-semibold">Buchung</th>
              <th className="px-3 py-2 font-semibold">Konto</th>
              <th className="px-3 py-2 font-semibold">Betrag</th>
              <th className="px-3 py-2 font-semibold">Fixkosten</th>
              <th className="px-3 py-2 font-semibold">wirkt_fuer_monat</th>
              <th className="px-3 py-2 font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignmentRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-600">
                  Keine manuellen Ausgaben fuer Markierung vorhanden.
                </td>
              </tr>
            ) : (
              assignmentRows.map((row) => (
                <tr key={row.transactionId}>
                  <td className="px-3 py-2 text-slate-700">{row.bookingDate}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.description}</td>
                  <td className="px-3 py-2 text-slate-700">{row.accountName}</td>
                  <td className="px-3 py-2 text-slate-700">{formatEuro(row.amountCents)}</td>
                  <td className="px-3 py-2">
                    <form action={updateFixedCostAssignmentAction} className="grid gap-2 md:grid-cols-3">
                      <input type="hidden" name="transactionId" value={row.transactionId} />
                      <select name="fixedCostId" defaultValue={String(row.fixedCostId ?? "")} className="rounded border border-slate-300 px-2 py-1 text-xs">
                        <option value="">-</option>
                        {activeFixedCosts.map((fixedCost) => (
                          <option key={fixedCost.id} value={fixedCost.id}>
                            {fixedCost.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="effectiveMonthKey"
                        defaultValue={row.effectiveMonthKey ?? row.bookingDate.slice(0, 7)}
                        placeholder="YYYY-MM"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <div className="flex gap-2">
                        <button type="submit" name="intent" value="save" className="rounded border border-sky-300 bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
                          Speichern
                        </button>
                        <button type="submit" name="intent" value="remove" className="rounded border border-red-300 bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                          Entfernen
                        </button>
                      </div>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.fixedCostName ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.effectiveMonthKey ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">Nur fuer manuelle Ausgaben</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
