import type { CSSProperties } from "react";

import { getDashboardMonthSnapshot } from "@/src/dashboard/repository";
import { buildDashboardKpis, formatEuro } from "@/src/dashboard/ui";
import { formatMonthLabel, getCurrentMonthKey } from "@/src/months/repository";

export const dynamic = "force-dynamic";

function amountTone(cents: number): string {
  if (cents < 0) {
    return "text-[#b91c1c]";
  }

  if (cents > 0) {
    return "text-[#08766b]";
  }

  return "text-[color:var(--month-ink)]";
}

function currentStandAccent(cents: number): string {
  if (cents < 0) {
    return "bg-[#f17680]";
  }

  if (cents > 0) {
    return "bg-[#8bf0df]";
  }

  return "bg-[color:var(--month-accent)]";
}

function currentStandStatus(cents: number): string {
  if (cents < 0) {
    return "Unter Plan";
  }

  if (cents > 0) {
    return "Im Plus";
  }

  return "Ausgeglichen";
}

function kpiAccent(label: string): string {
  if (label === "Einnahmen") {
    return "bg-[#8bf0df]";
  }

  if (label === "Ausgaben") {
    return "bg-[#74171d]";
  }

  return "bg-[#d9f7b5]";
}

function kpiMarkerStyle(label: string): CSSProperties {
  if (label === "Einnahmen") {
    return { color: "#055c52" };
  }

  if (label === "Ausgaben") {
    return { color: "#ffffff" };
  }

  return { color: "#365f08" };
}

function kpiMarker(label: string): string {
  if (label === "Einnahmen") {
    return "↙";
  }

  if (label === "Ausgaben") {
    return "↗";
  }

  return "↟";
}

function kpiValueStyle(label: string): CSSProperties {
  if (label === "Einnahmen") {
    return { color: "#08766b" };
  }

  if (label === "Ausgaben") {
    return { color: "#f17680" };
  }

  return { color: "#4f7d12" };
}

export default async function HomePage() {
  const snapshot = getDashboardMonthSnapshot(getCurrentMonthKey());
  const kpis = buildDashboardKpis(snapshot);
  const monthLabel = formatMonthLabel(snapshot.totals.monthKey);
  const monthHref = `/monate/${snapshot.totals.monthKey}`;
  const openWorkLabel =
    snapshot.openAssignmentCount === 0
      ? "Alles zugeordnet"
      : `${snapshot.openAssignmentCount} Buchung${snapshot.openAssignmentCount === 1 ? "" : "en"} ohne Zuordnung`;

  return (
    <div className="month-page-shell space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-[radial-gradient(circle_at_88%_14%,rgba(134,239,222,0.16),transparent_22rem),linear-gradient(180deg,rgba(234,248,255,0.96),rgba(245,251,255,0.84))] p-6 shadow-[0_24px_58px_rgba(7,27,70,0.07)] backdrop-blur md:p-8 xl:p-10">
        <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-white/60 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Dashboard</p>
            <h1 className="mt-4 text-[clamp(2.35rem,5.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.08em] text-[color:var(--month-ink)]">
              {monthLabel}
            </h1>
          </div>

          <div className="relative overflow-hidden rounded-[1.65rem] border border-white/95 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(239,248,253,0.78))] p-4 text-left shadow-[0_20px_42px_rgba(7,27,70,0.09)] backdrop-blur md:min-w-[17rem] md:p-5">
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-200/28 blur-2xl" aria-hidden="true" />
            <div className={`absolute inset-x-5 top-0 h-1 rounded-b-full ${currentStandAccent(snapshot.totals.availableCents)}`} aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--month-ink-muted)]">
                  Aktueller Stand
                </p>
                <span className="rounded-full border border-white/80 bg-white/72 px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.12em] text-[color:var(--month-ink-soft)] shadow-[0_8px_18px_rgba(7,27,70,0.06)]">
                  {currentStandStatus(snapshot.totals.availableCents)}
                </span>
              </div>
              <p className={`mt-3 text-[2.15rem] font-black leading-none tracking-[-0.065em] md:text-[2.85rem] ${amountTone(snapshot.totals.availableCents)}`}>
                {formatEuro(snapshot.totals.availableCents)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {kpis.map((card) => (
          <article key={card.label} className="month-stat-card overflow-hidden">
            <div
              className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${kpiAccent(card.label)}`}
              aria-hidden="true"
            >
              <span className="text-lg font-bold leading-none" style={kpiMarkerStyle(card.label)}>
                {kpiMarker(card.label)}
              </span>
            </div>
            <p className="month-stat-label">{card.label}</p>
            <p className="month-stat-value mt-3" style={kpiValueStyle(card.label)}>
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="month-section-panel">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Offene Arbeit</p>
            <h2 className="month-section-title mt-2">{openWorkLabel}</h2>
            <p className="month-section-copy mt-3 max-w-2xl">
              Gezaehlt werden nur Buchungen, die wirklich eine Kategorie oder Sonderkategorie brauchen. Transfers und Fixkosten-Kontrolltreffer bleiben draussen.
            </p>
          </div>
          <a
            href={monthHref}
            className="inline-flex w-fit rounded-full bg-[color:var(--month-ink)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(20,33,61,0.18)] transition hover:-translate-y-0.5"
          >
            Monatsansicht oeffnen
          </a>
        </div>
      </section>
    </div>
  );
}
