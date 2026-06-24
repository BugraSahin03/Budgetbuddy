"use client";

import { useEffect, useMemo, useState } from "react";

export type MonthBookingFilterOption = {
  label: string;
  token: string;
  tone: "category" | "specialBudget" | "open";
};

type MonthBookingFilterProps = {
  options: MonthBookingFilterOption[];
  totalCount: number;
};

const rowSelector = "[data-month-booking-row]";

function optionToneClassName(tone: MonthBookingFilterOption["tone"]): string {
  if (tone === "specialBudget") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "open") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function filterBookingRows(selectedTokens: string[]): number {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(rowSelector));

  if (selectedTokens.length === 0) {
    for (const row of rows) {
      row.hidden = false;
    }

    return rows.length;
  }

  let visibleCount = 0;

  for (const row of rows) {
    const tokens = (row.dataset.bookingFilterTokens ?? "")
      .split(" ")
      .filter(Boolean);
    const isVisible = selectedTokens.some((token) => tokens.includes(token));

    row.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  }

  return visibleCount;
}

export function MonthBookingFilter({
  options,
  totalCount,
}: MonthBookingFilterProps) {
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(totalCount);
  const selectedSet = useMemo(() => new Set(selectedTokens), [selectedTokens]);
  const optionByToken = useMemo(
    () => new Map(options.map((option) => [option.token, option])),
    [options],
  );
  const selectedOptions = selectedTokens
    .map((token) => optionByToken.get(token))
    .filter((option): option is MonthBookingFilterOption => option !== undefined);
  const availableOptions = options.filter((option) => !selectedSet.has(option.token));
  const hasActiveFilter = selectedTokens.length > 0;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisibleCount(filterBookingRows(selectedTokens));
    }, 0);

    function handleRowUpdate() {
      setVisibleCount(filterBookingRows(selectedTokens));
    }

    document.addEventListener("month-booking-filter-row-updated", handleRowUpdate);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener(
        "month-booking-filter-row-updated",
        handleRowUpdate,
      );
    };
  }, [selectedTokens, totalCount]);

  function toggleToken(token: string): void {
    setSelectedTokens((currentTokens) =>
      currentTokens.includes(token)
        ? currentTokens.filter((currentToken) => currentToken !== token)
        : [...currentTokens, token],
    );
  }

  function addToken(token: string): void {
    if (token.length === 0) return;
    toggleToken(token);
  }

  function resetFilter(): void {
    setSelectedTokens([]);
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[1.35rem] border border-[color:var(--month-line)] bg-[#f7fbfe]/82 p-4 shadow-[0_10px_24px_rgba(7,27,70,0.025)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
            Filter
          </p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--month-ink-soft)]">
            {hasActiveFilter
              ? `${visibleCount} von ${totalCount} Buchungen sichtbar`
              : "Alle Buchungen sichtbar"}
          </p>
        </div>

        {hasActiveFilter ? (
          <button
            type="button"
            className="w-fit rounded-full border border-[color:var(--month-line)] bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[color:var(--month-ink)] shadow-[0_8px_18px_rgba(7,27,70,0.035)] transition hover:-translate-y-0.5"
            onClick={resetFilter}
          >
            Filter zurücksetzen
          </button>
        ) : null}
      </div>

      <label className="mt-4 grid max-w-sm gap-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
        Filter hinzufügen
        <select
          value=""
          className="rounded-2xl border border-[color:var(--month-line)] bg-white px-3 py-2 text-sm font-black normal-case tracking-normal text-[color:var(--month-ink)] shadow-[0_8px_18px_rgba(7,27,70,0.025)] focus:outline-none"
          onChange={(event) => addToken(event.currentTarget.value)}
        >
          <option value="">Kategorie oder Sonderkategorie wählen</option>
          {availableOptions.map((option) => (
            <option key={option.token} value={option.token}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {selectedOptions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.token}
              type="button"
              aria-pressed="true"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-[0_8px_18px_rgba(7,27,70,0.025)] transition hover:-translate-y-0.5 ${optionToneClassName(option.tone)}`}
              onClick={() => toggleToken(option.token)}
            >
              <span aria-hidden="true">✓</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {hasActiveFilter && visibleCount === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[color:var(--month-line-strong)] bg-white/76 px-4 py-3 text-sm font-semibold text-[color:var(--month-ink-soft)]">
          Keine Buchung passt zu diesem Filter.
        </p>
      ) : null}
    </div>
  );
}
