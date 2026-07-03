"use client";

import { useMemo, useState } from "react";

export type MonthTrendMetric = "income" | "expense" | "savings";

export type MonthTrendSummary = {
  metric: MonthTrendMetric;
  label: string;
  valueLabel: string;
  deltaLabel: string;
  deltaClassName: string;
  points: Array<{
    monthKey: string;
    label: string;
    valueCents: number;
  }>;
};

type MonthTrendChartProps = {
  summaries: MonthTrendSummary[];
};

type SharedTrendChart = {
  maxValueCents: number;
  axisValuesCents: number[];
  windowStartIndex: number;
  windowEndIndex: number;
  monthLabels: Array<{
    monthKey: string;
    label: string;
    x: number;
    show: boolean;
  }>;
  paths: Array<{
    metric: MonthTrendMetric;
    label: string;
    stroke: string;
    path: string;
  }>;
};

const CHART_LEFT = 62;
const CHART_RIGHT = 362;
const CHART_TOP = 22;
const CHART_BOTTOM = 140;
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

const TREND_METRIC_STYLES: Record<MonthTrendMetric, {
  text: string;
  dot: string;
  glow: string;
  stroke: string;
}> = {
  income: {
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_0_5px_rgba(16,185,129,0.12)]",
    stroke: "#059669",
  },
  expense: {
    text: "text-rose-600",
    dot: "bg-rose-500",
    glow: "shadow-[0_0_0_5px_rgba(244,63,94,0.12)]",
    stroke: "#e11d48",
  },
  savings: {
    text: "text-[#4f7d12]",
    dot: "bg-lime-500",
    glow: "shadow-[0_0_0_5px_rgba(132,204,22,0.14)]",
    stroke: "#65a30d",
  },
};

function formatEuroAxis(valueCents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

function getAxisStepCents(maxValueCents: number): number {
  if (maxValueCents <= 100000) {
    return 25000;
  }

  if (maxValueCents <= 250000) {
    return 50000;
  }

  if (maxValueCents <= 800000) {
    return 100000;
  }

  return 200000;
}

function buildAxisValues(maxValueCents: number): number[] {
  const axisStepCents = getAxisStepCents(maxValueCents);
  const axisMaxCents = Math.max(axisStepCents, Math.ceil(maxValueCents / axisStepCents) * axisStepCents);
  const values: number[] = [];

  for (let value = axisMaxCents; value >= 0; value -= axisStepCents) {
    values.push(value);
  }

  return values;
}

function buildSharedTrendPath(points: MonthTrendSummary["points"], maxValueCents: number): string {
  if (points.length === 0) {
    return "";
  }

  const xStep = points.length > 1 ? CHART_WIDTH / (points.length - 1) : 0;

  return points
    .map((point, index) => {
      const x = CHART_LEFT + index * xStep;
      const y = CHART_BOTTOM - (point.valueCents / maxValueCents) * CHART_HEIGHT;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function getVisibleMonthLabel(point: MonthTrendSummary["points"][number]): string {
  if (point.monthKey.endsWith("-01")) {
    return point.monthKey.slice(0, 4);
  }

  return point.monthKey.slice(5);
}

function shouldShowMonthLabel(index: number, totalMonthCount: number, monthKey: string): boolean {
  if (index === 0 || index === totalMonthCount - 1) {
    return true;
  }

  if (totalMonthCount <= 12) {
    return true;
  }

  if (totalMonthCount <= 24) {
    return monthKey.endsWith("-01") || monthKey.endsWith("-07");
  }

  return monthKey.endsWith("-01");
}

function buildSharedTrendChart(
  summaries: MonthTrendSummary[],
  visibleMonthCount: number,
  windowStartIndex: number,
): SharedTrendChart {
  const windowEndIndex = windowStartIndex + visibleMonthCount;
  const visibleSummaries = summaries.map((summary) => ({
    ...summary,
    points: summary.points.slice(windowStartIndex, windowEndIndex),
  }));
  const rawMaxValueCents = Math.max(
    1,
    ...visibleSummaries.flatMap((summary) => summary.points.map((point) => point.valueCents)),
  );
  const axisValuesCents = buildAxisValues(rawMaxValueCents);
  const maxValueCents = axisValuesCents[0] ?? rawMaxValueCents;
  const monthPoints = visibleSummaries[0]?.points ?? [];
  const xStep = monthPoints.length > 1 ? CHART_WIDTH / (monthPoints.length - 1) : 0;

  return {
    maxValueCents,
    axisValuesCents,
    windowStartIndex,
    windowEndIndex,
    monthLabels: monthPoints.map((point, index) => ({
      monthKey: point.monthKey,
      label: getVisibleMonthLabel(point),
      x: CHART_LEFT + index * xStep,
      show: shouldShowMonthLabel(index, monthPoints.length, point.monthKey),
    })),
    paths: visibleSummaries.map((summary) => ({
      metric: summary.metric,
      label: summary.label,
      stroke: TREND_METRIC_STYLES[summary.metric].stroke,
      path: buildSharedTrendPath(summary.points, maxValueCents),
    })),
  };
}

export function MonthTrendChart({ summaries }: MonthTrendChartProps) {
  const totalMonthCount = summaries[0]?.points.length ?? 0;
  const minMonthCount = Math.min(3, Math.max(1, totalMonthCount));
  const maxWindowMonthCount = Math.min(36, totalMonthCount);
  const [visibleMonthCount, setVisibleMonthCount] = useState(Math.min(12, Math.max(minMonthCount, maxWindowMonthCount)));
  const [windowStartIndex, setWindowStartIndex] = useState(Math.max(0, totalMonthCount - visibleMonthCount));
  const [isExpanded, setIsExpanded] = useState(true);
  const maxWindowStartIndex = Math.max(0, totalMonthCount - visibleMonthCount);
  const safeWindowStartIndex = Math.min(windowStartIndex, maxWindowStartIndex);
  const chart = useMemo(
    () => buildSharedTrendChart(summaries, visibleMonthCount, safeWindowStartIndex),
    [summaries, visibleMonthCount, safeWindowStartIndex],
  );
  const firstVisibleMonth = chart.monthLabels[0]?.monthKey ?? "";
  const lastVisibleMonth = chart.monthLabels.at(-1)?.monthKey ?? "";

  return (
    <section className="month-section-panel">
      <div className="flex flex-col gap-4 border-b border-[color:var(--month-line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <p className="month-eyebrow">Trend</p>
          <h2 className="month-section-title mt-2">Finanzspur der letzten Monate</h2>
        </div>

        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls="month-trend-chart-panel"
          aria-label={isExpanded ? "Finanzspur einklappen" : "Finanzspur ausklappen"}
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full border border-[color:var(--month-line)] bg-white/82 text-xl font-semibold text-[color:var(--month-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-white sm:self-auto"
        >
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>

      <div id="month-trend-chart-panel" hidden={!isExpanded} className="pt-5">
        <div className="grid gap-4 rounded-[1.65rem] border border-[color:var(--month-line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(239,249,252,0.72))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)] md:p-5 xl:grid-cols-[minmax(11rem,0.42fr)_minmax(0,1.58fr)] xl:items-stretch">
          <div>
            <p className="month-stat-label">Aktueller Monat</p>
            <div className="mt-3 grid gap-2">
            {summaries.map((summary) => {
              const styles = TREND_METRIC_STYLES[summary.metric];

              return (
                <div
                  key={summary.metric}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/78 bg-white/68 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} ${styles.glow}`} aria-hidden="true" />
                    <span className="text-xs font-black uppercase tracking-[0.13em] text-[color:var(--month-ink-soft)]">
                      {summary.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black tracking-[-0.025em] ${styles.text}`}>{summary.valueLabel}</p>
                    <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.1em] ${summary.deltaClassName}`}>
                      {summary.deltaLabel}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/78 bg-white/58 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="month-stat-label">Verlauf</p>
              <p className="mt-1 text-xs font-bold text-[color:var(--month-ink-soft)]">
                {firstVisibleMonth} bis {lastVisibleMonth}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {summaries.map((summary) => {
                const styles = TREND_METRIC_STYLES[summary.metric];

                return (
                  <span key={summary.metric} className="inline-flex items-center gap-1.5 rounded-full bg-white/78 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.11em] text-[color:var(--month-ink-soft)]">
                    <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
                    {summary.label}
                  </span>
                );
              })}
            </div>
          </div>

          {totalMonthCount > minMonthCount ? (
            <div className="mt-4 grid gap-2 rounded-2xl border border-white/80 bg-white/60 px-3 py-2.5">
              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[color:var(--month-ink-soft)]">
                  Zeitraum
                  <span>{visibleMonthCount}/{totalMonthCount}</span>
                </span>
                <input
                  type="range"
                  min={minMonthCount}
                  max={maxWindowMonthCount}
                  value={visibleMonthCount}
                  onChange={(event) => {
                    const nextVisibleMonthCount = Number(event.target.value);
                    const nextMaxStartIndex = Math.max(0, totalMonthCount - nextVisibleMonthCount);
                    setVisibleMonthCount(nextVisibleMonthCount);
                    setWindowStartIndex((currentStartIndex) => Math.min(currentStartIndex, nextMaxStartIndex));
                  }}
                  className="w-full accent-[color:var(--month-ink)]"
                />
              </label>
              {maxWindowStartIndex > 0 ? (
                <label className="grid gap-2">
                  <span className="flex items-center justify-between gap-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[color:var(--month-ink-soft)]">
                    Fenster verschieben
                    <span>{firstVisibleMonth} bis {lastVisibleMonth}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={maxWindowStartIndex}
                    value={safeWindowStartIndex}
                    onChange={(event) => setWindowStartIndex(Number(event.target.value))}
                    className="w-full accent-[color:var(--month-ink)]"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <svg
            className="mt-4 h-56 w-full rounded-[1.15rem] border border-[color:var(--month-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,250,252,0.64))] p-2 md:h-72"
            viewBox="0 0 380 166"
            role="img"
            aria-label="Liniendiagramm mit dynamischer Euro-Achse fuer Einnahmen, Ausgaben und Gespart"
          >
            {chart.axisValuesCents.map((value, index) => {
              const y =
                chart.axisValuesCents.length > 1
                  ? CHART_TOP + index * (CHART_HEIGHT / (chart.axisValuesCents.length - 1))
                  : CHART_BOTTOM;

              return (
                <g key={value}>
                  <text x="4" y={y + 3} className="fill-slate-500 text-[0.58rem] font-black">
                    {formatEuroAxis(value)}
                  </text>
                  <line x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
                </g>
              );
            })}
            <line x1={CHART_LEFT} y1={CHART_TOP} x2={CHART_LEFT} y2={CHART_BOTTOM} stroke="rgba(15,23,42,0.18)" strokeWidth="1.2" />
            <line x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM} stroke="rgba(15,23,42,0.18)" strokeWidth="1.2" />
            {chart.paths.map((line) => (
              <path
                key={line.metric}
                d={line.path}
                fill="none"
                stroke={line.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                opacity="0.92"
              />
            ))}
            {chart.monthLabels.map((point) => (
              point.show ? (
                <text
                  key={point.monthKey}
                  x={point.x}
                  y="158"
                  textAnchor="middle"
                  className="fill-slate-500 text-[0.58rem] font-black"
                >
                  {point.label}
                </text>
              ) : null
            ))}
          </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
