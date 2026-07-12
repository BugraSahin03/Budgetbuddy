"use client";

import { useActionState, useState } from "react";

import { parseSparkasseCsvAction } from "@/app/import/actions";
import { importPreviewInitialState } from "@/app/import/state";
import type { SparkasseCsvRow } from "@/src/import/sparkasse-csv";

type PreviewRowView = {
  row: SparkasseCsvRow;
  rowIndex: number;
};

type FilteredPreviewRowView = {
  decision: NonNullable<
    typeof importPreviewInitialState.previewPlan
  >["filteredRows"][number];
  row: SparkasseCsvRow;
};

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

function isIncomeDeductionLabel(label: string): boolean {
  return label === "Einkommensabzug";
}

function suggestionTone(label: string): string {
  if (isFixedCostControlLabel(label)) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (isIncomeDeductionLabel(label)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function filteredReasonTone(reason: string): string {
  if (reason === "duplicate") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (reason === "fixed_cost_control") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (reason === "income_deduction_conflict") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function renderSuggestionText(params: { label: string; ruleName: string }): string {
  return `${params.label} · Regel: ${params.ruleName}`;
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
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const fallbackMonthKey = new Date().toISOString().slice(0, 7);
  const effectiveMonthDefault = resolveEffectiveMonthDefault({
    detectedMonthKey: state.detectedMonthKey,
    defaultEffectiveMonthKey,
    fallbackMonthKey,
    surface,
  });
  const suggestionByRowIndex = new Map(
    state.suggestions.map((suggestion) => [suggestion.rowIndex, suggestion]),
  );
  const resultRows = state.result?.rows ?? [];
  const importableRows: PreviewRowView[] = state.previewPlan
    ? state.previewPlan.importableRowIndexes
        .map((rowIndex) => ({
          row: resultRows[rowIndex],
          rowIndex,
        }))
        .filter((item): item is PreviewRowView => Boolean(item.row))
    : resultRows.map((row, rowIndex) => ({ row, rowIndex }));
  const filteredRows: FilteredPreviewRowView[] = state.previewPlan
    ? state.previewPlan.filteredRows
        .map((decision) => ({
          decision,
          row: resultRows[decision.rowIndex],
        }))
        .filter((item): item is FilteredPreviewRowView => Boolean(item.row))
    : [];
  const hasPreviewFile = state.previewFileToken !== null;
  const formSurfaceClass =
    surface === "embedded"
      ? "space-y-3 rounded-[1.5rem] border border-[color:var(--month-line)] bg-white/78 p-5"
      : "space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  const targetMonthHint = state.detectedMonthKey
    ? `Automatisch erkannt: ${state.detectedMonthKey}. Du kannst bei Bedarf überschreiben.`
    : "Ohne Eingabe wird der Zielmonat aus den Buchungen automatisch erkannt.";

  return (
    <div className="space-y-4">
      <form action={formAction} className={formSurfaceClass}>
        {returnMonthKey ? (
          <input type="hidden" name="returnMonthKey" value={returnMonthKey} />
        ) : null}
        <div>
          <label
            htmlFor="sparkasseCsv"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
          >
            Sparkassen-CSV Datei
          </label>
          {surface === "embedded" ? (
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Wähle einen originalen Sparkassen-CSV-Export aus. Nach der Vorschau kannst du den
              Import direkt für diesen Monat bestätigen.
            </p>
          ) : null}
          <input
            id="sparkasseCsv"
            name="sparkasseCsv"
            type="file"
            accept=".csv,.CSV,text/csv"
            className={
              surface === "embedded"
                ? "sr-only"
                : "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            }
            required={!hasPreviewFile}
            onChange={(event) => {
              setSelectedFilename(event.currentTarget.files?.[0]?.name ?? null);
            }}
          />
          {surface === "embedded" ? (
            <label htmlFor="sparkasseCsv" className="month-import-upload-box">
              <span aria-hidden="true">CSV</span>
              <strong>CSV auswählen</strong>
              <em>
                {selectedFilename ?? state.previewFilename ?? "Noch keine Datei ausgewählt"}
              </em>
            </label>
          ) : null}
          {hasPreviewFile ? (
            <p className="mt-1 text-xs text-slate-500">
              Vorschau geladen: {state.previewFilename}. Du kannst direkt bestätigen oder eine
              neue Datei auswählen.
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

        <div className="month-import-action-row flex flex-wrap gap-2">
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
            {isPending ? "Import läuft..." : "Import bestätigen"}
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Import abgeschlossen
          </p>
          <div className="mt-2 grid gap-2 text-sm text-emerald-900 md:grid-cols-4">
            <p>
              Importlauf-ID: <span className="font-semibold">{state.persisted.importRunId}</span>
            </p>
            <p>
              Gefunden: <span className="font-semibold">{state.persisted.detectedRows}</span>
            </p>
            <p>
              Importiert: <span className="font-semibold">{state.persisted.importedRows}</span>
            </p>
            <p>
              Duplikate: <span className="font-semibold">{state.persisted.duplicateRows}</span>
            </p>
          </div>
        </section>
      ) : null}

      {state.result?.errors.length ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Parsing-Hinweise
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {state.result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {state.result?.rows.length ? (
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                Herausgefiltert / Kontrolltreffer
              </p>
              <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-violet-950">
                Nicht in der normalen Importliste
              </h3>
            </div>
            <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-black text-violet-800">
              {filteredRows.length} Zeilen
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-violet-900">
            Diese Zeilen werden nicht als normale Monatsbuchungen importiert. Der Grund steht
            direkt an der Zeile.
          </p>
          {filteredRows.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-violet-950">
              {filteredRows.map(({ decision, row }) => (
                <li
                  key={`${decision.rowIndex}-${decision.reason}-${row.bookingDate}-${row.amountCents}`}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-black ${filteredReasonTone(decision.reason)}`}
                      >
                        {decision.reasonLabel}
                      </span>
                      {decision.suggestionLabel ? (
                        <span className="ml-2 inline-flex rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                          {decision.suggestionLabel}
                        </span>
                      ) : null}
                    </div>
                    <strong className={amountTone(row.amountCents)}>
                      {formatEuroFromCents(row.amountCents)}
                    </strong>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-slate-700 md:grid-cols-[0.8fr_1.4fr_1fr]">
                    <span>{row.bookingDate}</span>
                    <span className="font-semibold text-slate-950">{row.description}</span>
                    <span>{row.counterparty || "Keine Gegenpartei"}</span>
                  </div>
                  {decision.ruleName ? (
                    <p className="mt-2 text-xs font-semibold text-violet-700">
                      Regel: {decision.ruleName}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-violet-900">
              Keine Duplikate oder Kontrolltreffer in dieser Vorschau.
            </p>
          )}
        </section>
      ) : null}

      {state.result?.rows.length ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Wird importiert
              </p>
              <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-emerald-950">
                Finale Importliste
              </h3>
            </div>
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-800">
              {importableRows.length} Buchungen
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
            Diese Zeilen werden beim Bestätigen übernommen. Einkommensabzüge sind markiert und
            werden nicht als normale Ausgabe gezählt.
          </p>
          {surface === "embedded" ? (
            <div className="month-import-preview-cards">
              {importableRows.map(({ row, rowIndex }) => {
                const suggestion = suggestionByRowIndex.get(rowIndex);

                return (
                  <article
                    key={`${row.bookingDate}-${row.amountCents}-${row.description}-${row.endToEndReference}-card`}
                    className="month-import-preview-card"
                  >
                    <div>
                      <p>{row.bookingDate}</p>
                      <strong className={amountTone(row.amountCents)}>
                        {formatEuroFromCents(row.amountCents)}
                      </strong>
                    </div>
                    <h4>{row.description}</h4>
                    <p>{row.counterparty || "Keine Gegenpartei"}</p>
                    {row.info ? <p>{row.info}</p> : null}
                    {suggestion ? (
                      <span
                        className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${
                          suggestionTone(suggestion.label)
                        }`}
                      >
                        {renderSuggestionText(suggestion)}
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          {importableRows.length > 0 ? (
            <div className="month-import-preview-table mt-4 overflow-x-auto rounded-xl border border-emerald-100 bg-white">
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
                  {importableRows.map(({ row, rowIndex }) => {
                    const suggestion = suggestionByRowIndex.get(rowIndex);

                    return (
                      <tr
                        key={`${row.bookingDate}-${row.amountCents}-${row.description}-${row.endToEndReference}`}
                      >
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
                                suggestionTone(suggestion.label)
                              }`}
                            >
                              {renderSuggestionText(suggestion)}
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
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-900">
              Keine normalen neuen Monatsbuchungen in dieser Vorschau.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
