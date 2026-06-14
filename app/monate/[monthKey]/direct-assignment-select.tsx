"use client";

import { useRef } from "react";

type DirectAssignmentSelectProps = {
  currentAssignment: string;
  currentAssignmentLabel: string;
  hasAssignment: boolean;
  categoryOptions: Array<{
    id: number;
    name: string;
    iconName?: string | null;
  }>;
  specialBudgetOptions: Array<{
    id: number;
    name: string;
  }>;
};

export function DirectAssignmentSelect({
  currentAssignment,
  currentAssignmentLabel,
  hasAssignment,
  categoryOptions,
  specialBudgetOptions,
}: DirectAssignmentSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const hasCurrentAssignmentOption =
    currentAssignment.length > 0 &&
    [
      ...categoryOptions.map((category) => `category:${category.id}`),
      ...specialBudgetOptions.map((budget) => `specialBudget:${budget.id}`),
    ].includes(currentAssignment);

  return (
    <span className="relative inline-flex max-w-full">
      <select
        ref={selectRef}
        name="assignment"
        defaultValue={currentAssignment}
        aria-label="Kategoriezuordnung direkt aendern"
        className="max-w-full appearance-none rounded-full border border-[color:var(--month-line)] bg-white/82 py-1 pl-2.5 pr-7 text-xs font-black text-[color:var(--month-ink)] shadow-[0_8px_18px_rgba(7,27,70,0.035)] transition hover:-translate-y-0.5 hover:border-[color:var(--month-line-strong)] focus:border-sky-300 focus:outline-none"
        onChange={() => {
          selectRef.current?.form?.requestSubmit();
        }}
      >
        {!hasAssignment ? (
          <option value="" disabled>
            Zuordnen
          </option>
        ) : null}
        {hasAssignment && !hasCurrentAssignmentOption ? (
          <option value={currentAssignment}>{currentAssignmentLabel}</option>
        ) : null}
        <optgroup label="Kategorien">
          {categoryOptions.map((category) => (
            <option key={category.id} value={`category:${category.id}`}>
              {category.iconName ? `${category.iconName} ` : ""}
              {category.name}
            </option>
          ))}
        </optgroup>
        {specialBudgetOptions.length > 0 ? (
          <optgroup label="Sonderkategorien">
            {specialBudgetOptions.map((budget) => (
              <option key={budget.id} value={`specialBudget:${budget.id}`}>
                Sonderkategorie · {budget.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.85rem] font-black text-[color:var(--month-ink-muted)]"
      >
        ›
      </span>
    </span>
  );
}
