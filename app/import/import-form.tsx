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

function isFixedCostControlLabel(label: string): boolean {
  return label.startsWith("Fixkosten-Kontrolle:");
}

export function resolveEffectiveMonthDefault(params: {
  detectedMonthKey: string | null;
  defaultEffectiveMonthKey?: string;
  fallbackMonthKey: string;
  surface?: "default" | "embedded";
}): string {
  if (params.surface === "embedded" && params.defaultEffectiveMonthKey) {
    return params.defaultEffectiveMonthKey;
  }

  return params.detectedMonthKey ?? params.defaultEffectiveMonthKey ?? params.fallbackMonthKey;
}

export function ImportForm({
  defaultEffectiveMonthKey,
  returnMonthKey,
  surface = "default",
}: {
  defaultEffectiveMonthKey?: string;
  returnMonthKey?: string;
  surface?: "default" | "embedded";
}) {
  const [state, formAction, isPending] = useActionState(
    parseSparkasseCsvAction,
    importPreviewInitialState,
  );
  const fallbackMonthKey = new Date().toISOString().slice(0, 7);
  const effectiveMonthDefault = resolveEffectiveMonthDefault({
    detectedMonthKey: state.detectedMonthKey,
    defaultEffectiveMonthKey,
    fallbackMonthKey,
    surface,
  });
  const fixedCostControls = state.suggestions.filter((item) =>
    isFixedCostControlLabel(item.label),
  );
  const hasPreviewFile = state.previewFileToken !== null;
  const formSurfaceClass =
    surface === "embedded"
      ? "space-y-3 rounded-[1.5rem] border border-[color:var(--month-line)] bg-white/78 p-5"
      : "space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  const targetMonthHint = state.detectedMonthKey
    ? `Automatisch erkannt: ${state.detectedMonthKey}. Du kannst bei Bedarf ueberschreiben.`
    : "Ohne Eingabe wird der Zielmonat aus den Buchungen automatisch erkannt.";

  return (
    <div className="space-y-4">
      <form action={formAction} className={formSurfaceClass}>
        {returnMonthKey ? <input type="hidden" name="returnMonthKey" value={returnMonthKey} /> : null}
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
            required={!hasPreviewFile}
          />
          {hasPreviewFile ? (
            <p className="mt-1 text-xs text-slate-500">
              Vorschau geladen: {state.previewFilename}. Du kannst direkt bestaetigen oder eine
              neue Datei auswaehlen.
            </p>
          ) : null}
        </div>

        <div>
          {surface === "embedded" ? (
            <>
              <input name="effectiveMonthKey" type="hidden" defaultValue={effectiveMonthDefault} />
            </>
          ) : (
            <>
              <label
                htmlFor="effectiveMonthKey"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Zielmonat
              </label>
              <input
                key={effectiveMonthDefault}
                id="effectiveMonthKey"
                name="effectiveMonthKey"
                type="month"
                defaultValue={effectiveMonthDefault}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">{targetMonthHint}</p>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="intent"
            value="preview"
            disabled={isPending}
            className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Wird verarbeitet..." : "Vorschau laden"}
          </button>

          <button
            type="submit"
            name="intent"
            value="confirm"
            disabled={isPending}
            className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Import laeuft..." : "Import bestaetigen"}
          </button>
        </div>
      </form>

      {state.fatalError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.fatalError}
        </p>
      ) : null}

      {state.persisted ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Import abgeschlossen</p>
          <div className="mt-2 grid gap-2 text-sm text-emerald-900 md:grid-cols-4">
            <p>Importlauf-ID: <span className="font-semibold">{state.persisted.importRunId}</span></p>
            <p>Gefunden: <span className="font-semibold">{state.persisted.detectedRows}</span></p>
            <p>Importiert: <span className="font-semibold">{state.persisted.importedRows}</span></p>
            <p>Duplikate: <span className="font-semibold">{state.persisted.duplicateRows}</span></p>
          </div>
        </section>
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
                <th className="px-3 py-2 font-semibold">Regelvorschlag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.result.rows.map((row, index) => {
                const suggestion = state.suggestions.find((item) => item.rowIndex === index);

                return (
                <tr key={`${row.bookingDate}-${row.amountCents}-${row.description}-${row.endToEndReference}`}>
                  <td className="px-3 py-2 text-slate-700">{row.bookingDate}</td>
                  <td className={`px-3 py-2 font-semibold ${amountTone(row.amountCents)}`}>
                    {formatEuroFromCents(row.amountCents)}
                  </td>
                  <td className="px-3 py-2 text-slate-900">{row.description}</td>
                  <td className="px-3 py-2 text-slate-700">{row.counterparty}</td>
                  <td className="px-3 py-2 text-slate-600">{row.info || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {suggestion ? (
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          isFixedCostControlLabel(suggestion.label)
                            ? "border-violet-200 bg-violet-50 text-violet-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {suggestion.label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {state.result?.rows.length && fixedCostControls.length ? (
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
            Fixkosten-Kontrollsicht
          </p>
          <p className="mt-1 text-sm text-violet-900">
            Diese Treffer werden als Fixkostenbezogene Kontrolle markiert und nicht als normale
            variable Regelzuordnung behandelt.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-violet-900">
            {fixedCostControls.map((item) => {
              const row = state.result?.rows[item.rowIndex];
              if (!row) {
                return null;
              }

              return (
                <li key={`${item.rowIndex}-${item.ruleName}`} className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-violet-700"> | </span>
                  <span>{row.bookingDate}</span>
                  <span className="text-violet-700"> | </span>
                  <span>{row.description}</span>
                  <span className="text-violet-700"> | </span>
                  <span>{formatEuroFromCents(row.amountCents)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
