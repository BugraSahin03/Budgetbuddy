"use client";

import { useActionState } from "react";

import { parseSparkasseCsvAction } from "@/app/import/actions";
import { importPreviewInitialState } from "@/app/import/state";

function formatEuroFromCents(amountCents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function amountTone(amountCents: number): string {
  return amountCents < 0 ? "text-red-700" : "text-emerald-700";
}

export function ImportForm() {
  const [state, formAction, isPending] = useActionState(
    parseSparkasseCsvAction,
    importPreviewInitialState,
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="sparkasseCsv" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Sparkassen-CSV Datei
          </label>
          <input
            id="sparkasseCsv"
            name="sparkasseCsv"
            type="file"
            accept=".csv,.CSV,text/csv"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "CSV wird geparst..." : "Vorschau laden"}
        </button>
      </form>

      {state.fatalError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.fatalError}
        </p>
      ) : null}

      {state.result?.errors.length ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Parsing-Hinweise</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {state.result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {state.result?.rows.length ? (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Buchungstag</th>
                <th className="px-3 py-2 font-semibold">Betrag</th>
                <th className="px-3 py-2 font-semibold">Beschreibung</th>
                <th className="px-3 py-2 font-semibold">Gegenpartei</th>
                <th className="px-3 py-2 font-semibold">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.result.rows.map((row) => (
                <tr key={`${row.bookingDate}-${row.amountCents}-${row.description}`}>
                  <td className="px-3 py-2 text-slate-700">{row.bookingDate}</td>
                  <td className={`px-3 py-2 font-semibold ${amountTone(row.amountCents)}`}>
                    {formatEuroFromCents(row.amountCents)}
                  </td>
                  <td className="px-3 py-2 text-slate-900">{row.description}</td>
                  <td className="px-3 py-2 text-slate-700">{row.counterparty}</td>
                  <td className="px-3 py-2 text-slate-600">{row.info || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
