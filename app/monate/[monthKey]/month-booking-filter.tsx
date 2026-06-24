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
    <div className="rounded-[1.45rem] border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(247,251,254,0.74))] px-3 py-3 shadow-[0_14px_32px_rgba(7,27,70,0.045)] ring-1 ring-[color:var(--month-line)]/55 backdrop-blur sm:px-3.5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="month-booking-filter-select">
            Buchungen filtern
          </label>
          <span className="relative inline-flex min-w-0 items-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]"
            >
              Filter
            </span>
            <select
              id="month-booking-filter-select"
              value=""
              className="min-w-0 appearance-none rounded-full border border-[color:var(--month-line)] bg-white/88 py-2 pl-[4.6rem] pr-9 text-xs font-black text-[color:var(--month-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(7,27,70,0.035)] outline-none transition hover:border-[color:var(--month-line-strong)] focus:border-[color:var(--month-line-strong)] sm:min-w-72"
              onChange={(event) => addToken(event.currentTarget.value)}
            >
              <option value="">Kategorie wählen</option>
              {availableOptions.map((option) => (
                <option key={option.token} value={option.token}>
                  {option.label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 text-sm font-black text-[color:var(--month-ink-muted)]"
            >
              ↓
            </span>
          </span>

          <span className="inline-flex w-fit items-baseline gap-1 rounded-full border border-[color:var(--month-line)] bg-white/72 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.11em] text-[color:var(--month-ink-muted)] shadow-[0_6px_16px_rgba(7,27,70,0.025)]">
            <strong className="text-xs tracking-normal text-[color:var(--month-ink)]">
              {hasActiveFilter ? visibleCount : totalCount}
            </strong>
            <span>/ {totalCount}</span>
          </span>
        </div>

        {hasActiveFilter ? (
          <button
            type="button"
            aria-label="Filter zurücksetzen"
            title="Filter zurücksetzen"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--month-line)] bg-white/82 text-sm font-black text-[color:var(--month-ink-soft)] shadow-[0_8px_18px_rgba(7,27,70,0.035)] transition hover:-translate-y-0.5 hover:border-[color:var(--month-line-strong)] hover:text-[color:var(--month-ink)]"
            onClick={resetFilter}
          >
            ×
          </button>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[color:var(--month-line)]/65 pt-2.5">
          {selectedOptions.map((option) => (
            <button
              key={option.token}
              type="button"
              aria-pressed="true"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-black shadow-[0_6px_14px_rgba(7,27,70,0.025)] transition hover:-translate-y-0.5 ${optionToneClassName(option.tone)}`}
              onClick={() => toggleToken(option.token)}
            >
              <span>{option.label}</span>
              <span aria-hidden="true" className="text-[0.75rem] leading-none opacity-70">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {hasActiveFilter && visibleCount === 0 ? (
        <p className="mt-2.5 rounded-2xl border border-dashed border-[color:var(--month-line-strong)] bg-[#f7fbfe]/80 px-3 py-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
          Keine Treffer.
        </p>
      ) : null}
    </div>
  );
}
