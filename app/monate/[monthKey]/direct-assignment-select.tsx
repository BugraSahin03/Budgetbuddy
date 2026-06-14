"use client";

import { useState, useTransition } from "react";

type DirectAssignmentSelectProps = {
  currentAssignment: string;
  currentAssignmentLabel: string;
  hasAssignment: boolean;
  monthKey: string;
  transactionId: number;
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
  monthKey,
  transactionId,
  categoryOptions,
  specialBudgetOptions,
}: DirectAssignmentSelectProps) {
  const [selectedAssignment, setSelectedAssignment] = useState(currentAssignment);
  const [savedAssignment, setSavedAssignment] = useState(currentAssignment);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasSavedAssignment = savedAssignment.length > 0 || hasAssignment;
  const assignmentTone = hasSavedAssignment
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 focus:border-emerald-300"
    : "border-red-200 bg-red-50 text-red-700 hover:border-red-300 focus:border-red-300";
  const hasCurrentAssignmentOption =
    savedAssignment.length > 0 &&
    [
      ...categoryOptions.map((category) => `category:${category.id}`),
      ...specialBudgetOptions.map((budget) => `specialBudget:${budget.id}`),
    ].includes(savedAssignment);

  function updateAssignment(assignment: string): void {
    const previousAssignment = savedAssignment;

    setSelectedAssignment(assignment);
    setSavedAssignment(assignment);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/monate/${monthKey}/assignments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment, transactionId }),
        });
        const body = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(
            body.error ?? "Zuordnung konnte nicht gespeichert werden.",
          );
        }
      } catch (caughtError) {
        setSelectedAssignment(previousAssignment);
        setSavedAssignment(previousAssignment);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Zuordnung konnte nicht gespeichert werden.",
        );
      }
    });
  }

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <span className="relative inline-flex max-w-full">
        <select
          name="assignment"
          value={selectedAssignment}
          aria-label="Kategoriezuordnung direkt aendern"
          aria-busy={isPending}
          className={`max-w-full appearance-none rounded-full border py-1 pl-2.5 pr-7 text-xs font-black shadow-[0_8px_18px_rgba(7,27,70,0.035)] transition hover:-translate-y-0.5 focus:outline-none disabled:cursor-wait disabled:opacity-75 ${assignmentTone}`}
          disabled={isPending}
          onChange={(event) => updateAssignment(event.target.value)}
        >
          {!hasSavedAssignment ? (
            <option value="" disabled>
              Zuordnen
            </option>
          ) : null}
          {hasSavedAssignment && !hasCurrentAssignmentOption ? (
            <option value={savedAssignment}>{currentAssignmentLabel}</option>
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
          className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.85rem] font-black ${hasSavedAssignment ? "text-emerald-700/70" : "text-red-700/70"}`}
        >
          ›
        </span>
      </span>
      {error ? (
        <span className="max-w-44 text-[0.65rem] font-extrabold text-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}
