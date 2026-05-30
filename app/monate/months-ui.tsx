"use client";

import type { ReactNode } from "react";

export function MonthPageShell({ children }: { children: ReactNode }) {
  return <div className="month-page-shell space-y-6 md:space-y-8">{children}</div>;
}

export function MonthHero({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <section className="month-hero-panel relative overflow-hidden">
      <div className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
      <div className="month-hero-orb month-hero-orb-right" aria-hidden="true" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="month-eyebrow">{eyebrow}</p>
          <h1 className="month-hero-title mt-3">{title}</h1>
          <p className="month-hero-copy mt-3">{description}</p>
        </div>

        {aside ? <div className="month-hero-aside">{aside}</div> : null}
      </div>
    </section>
  );
}

export function MonthSection({
  eyebrow,
  title,
  description,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="month-section-panel">
      <div className="flex flex-col gap-4 border-b border-[color:var(--month-line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="month-eyebrow">{eyebrow}</p>
          <h2 className="month-section-title mt-2">{title}</h2>
          {description ? <p className="month-section-copy mt-2">{description}</p> : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>

      <div className="pt-5">{children}</div>
    </section>
  );
}

export function MonthStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "calm";
}) {
  return (
    <article className={`month-stat-card month-stat-card-${tone}`}>
      <p className="month-stat-label">{label}</p>
      <p className="month-stat-value mt-3">{value}</p>
    </article>
  );
}

export function MonthChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warn" | "violet";
}) {
  return <span className={`month-chip month-chip-${tone}`}>{children}</span>;
}

export function MonthTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--month-line)] bg-[color:var(--month-surface-muted)]">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
