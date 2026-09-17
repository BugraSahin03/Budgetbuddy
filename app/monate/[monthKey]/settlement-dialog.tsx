"use client";

import { useMemo, useRef, useState } from "react";

import { createMonthlySettlementAction } from "@/app/monate/actions";

type EligibleBooking = {
  id: number;
  bookingDate: string;
  displayName: string;
  amountCents: number;
  accountName: string;
};

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function SettlementDialog({
  monthKey,
  monthLabel,
  bookings,
}: {
  monthKey: string;
  monthLabel: string;
  bookings: EligibleBooking[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selected = useMemo(
    () => bookings.filter((booking) => selectedIds.has(booking.id)),
    [bookings, selectedIds],
  );
  const negativeCents = selected
    .filter((booking) => booking.amountCents < 0)
    .reduce((sum, booking) => sum + booking.amountCents, 0);
  const positiveCents = selected
    .filter((booking) => booking.amountCents > 0)
    .reduce((sum, booking) => sum + booking.amountCents, 0);
  const resultCents = negativeCents + positiveCents;
  const canSubmit = negativeCents < 0 && positiveCents > 0;

  function toggle(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        className="month-dialog-trigger"
        onClick={() => dialogRef.current?.showModal()}
      >
        Verrechnen
      </button>
      <dialog ref={dialogRef} className="month-dialog">
        <div className="month-dialog-surface">
          <div className="flex items-start justify-between gap-4 border-b border-[color:var(--month-line)] pb-5">
            <div>
              <p className="month-eyebrow">Buchungen verrechnen</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                {monthLabel}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--month-ink-soft)]">
                Wähle mindestens eine Ausgabe und eine Einnahme. Die echten
                Kontobewegungen bleiben erhalten; in den Auswertungen zählt
                anschließend nur noch das Ergebnis.
              </p>
            </div>
            <form method="dialog">
              <button type="submit" className="month-dialog-close">
                Schließen
              </button>
            </form>
          </div>

          <form action={createMonthlySettlementAction} className="mt-6 grid gap-5">
            <input type="hidden" name="monthKey" value={monthKey} />
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--month-ink-muted)]">
              Name (optional)
              <input
                name="name"
                maxLength={80}
                placeholder="z. B. Auslage Teamessen"
                className="rounded-xl border border-[color:var(--month-line)] bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-[color:var(--month-ink)]"
              />
            </label>

            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {bookings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[color:var(--month-line-strong)] p-5 text-sm text-[color:var(--month-ink-soft)]">
                  In diesem Monat gibt es keine geeigneten, noch unverrechneten Buchungen.
                </p>
              ) : (
                bookings.map((booking) => (
                  <label
                    key={booking.id}
                    className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 transition ${
                      selectedIds.has(booking.id)
                        ? "border-sky-300 bg-sky-50"
                        : "border-[color:var(--month-line)] bg-white hover:border-sky-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="transactionId"
                      value={booking.id}
                      checked={selectedIds.has(booking.id)}
                      onChange={() => toggle(booking.id)}
                      className="h-4 w-4"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[color:var(--month-ink)]">
                        {booking.displayName}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-[color:var(--month-ink-soft)]">
                        {booking.bookingDate} · {booking.accountName}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-black ${
                        booking.amountCents < 0 ? "text-[#d24d5a]" : "text-[#08766b]"
                      }`}
                    >
                      {formatEuro(booking.amountCents)}
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="grid gap-3 rounded-[1.2rem] border border-[color:var(--month-line)] bg-[#f7fbfe] p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--month-ink-muted)]">Ausgaben</p>
                <p className="mt-1 text-lg font-black text-[#d24d5a]">{formatEuro(negativeCents)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--month-ink-muted)]">Einnahmen</p>
                <p className="mt-1 text-lg font-black text-[#08766b]">{formatEuro(positiveCents)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--month-ink-muted)]">Ergebnis</p>
                <p className={`mt-1 text-lg font-black ${resultCents < 0 ? "text-[#d24d5a]" : "text-[#08766b]"}`}>
                  {formatEuro(resultCents)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                  {resultCents < 0
                    ? "wird als Ausgabe wirksam"
                    : resultCents > 0
                      ? "wird als Einnahme wirksam"
                      : "ohne KPI-Wirkung"}
                </p>
              </div>
            </div>

            {!canSubmit && selected.length > 0 ? (
              <p className="text-sm font-semibold text-amber-800">
                Es fehlt noch mindestens eine Buchung mit dem Gegenzeichen.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-fit rounded-2xl bg-[color:var(--month-ink)] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {selected.length} Buchungen verrechnen
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
