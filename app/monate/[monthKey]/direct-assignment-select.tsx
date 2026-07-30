"use client";

import { useRef, useState } from "react";

import { categoryDisplayIcon } from "@/app/components/category-visual";

type DirectAssignmentSelectProps = {
  amountCents: number;
  currentAssignment: string;
  currentAssignmentLabel: string;
  hasAssignment: boolean;
  monthKey: string;
  transactionId: number;
  categoryOptions: Array<{
    id: number;
    name: string;
    iconName?: string | null;
    colorHex?: string | null;
  }>;
  specialBudgetOptions: Array<{
    id: number;
    name: string;
    iconName?: string | null;
  }>;
};

type ParsedAssignment =
  | { type: "category"; id: number }
  | { type: "specialBudget"; id: number }
  | null;

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function parseAssignment(assignment: string): ParsedAssignment {
  const categoryMatch = assignment.match(/^category:(\d+)$/);
  if (categoryMatch) {
    return { type: "category", id: Number.parseInt(categoryMatch[1], 10) };
  }

  const specialBudgetMatch = assignment.match(/^specialBudget:(\d+)$/);
  if (specialBudgetMatch) {
    return {
      type: "specialBudget",
      id: Number.parseInt(specialBudgetMatch[1], 10),
    };
  }

  return null;
}

function createVisualMark(
  assignment: string,
  categoryOptions: DirectAssignmentSelectProps["categoryOptions"],
  specialBudgetOptions: DirectAssignmentSelectProps["specialBudgetOptions"],
): HTMLSpanElement {
  const parsedAssignment = parseAssignment(assignment);
  const mark = document.createElement("span");
  mark.className = "category-visual-mark h-10 w-10";

  if (parsedAssignment?.type === "category") {
    const category = categoryOptions.find(
      (option) => option.id === parsedAssignment.id,
    );

    mark.className += " text-xs";
    mark.style.backgroundColor = "rgba(223, 244, 253, 0.92)";
    mark.style.borderColor = "rgba(20, 33, 61, 0.24)";
    mark.style.borderWidth = "2px";
    mark.style.color = "#14213D";
    mark.textContent = categoryDisplayIcon({
      name: category?.name ?? "Kategorie",
      iconName: category?.iconName,
    });

    return mark;
  }

  if (parsedAssignment?.type === "specialBudget") {
    const specialBudget = specialBudgetOptions.find(
      (option) => option.id === parsedAssignment.id,
    );

    mark.className += " text-xs";
    mark.style.backgroundColor = "rgba(223, 244, 253, 0.92)";
    mark.style.borderColor = "rgba(20, 33, 61, 0.24)";
    mark.style.borderWidth = "2px";
    mark.style.color = "#14213D";
    mark.textContent = categoryDisplayIcon({
      name: specialBudget?.name ?? "Sonderkategorie",
      iconName: specialBudget?.iconName,
    });

    return mark;
  }

  mark.className += " border-red-200 bg-red-100 text-base text-red-700";
  mark.textContent = "?";

  return mark;
}

function updateLiveBookingPresentation(
  selectElement: HTMLSelectElement | null,
  assignment: string,
  categoryOptions: DirectAssignmentSelectProps["categoryOptions"],
  specialBudgetOptions: DirectAssignmentSelectProps["specialBudgetOptions"],
): void {
  const row = selectElement?.closest<HTMLElement>("[data-month-booking-row]");

  if (!row) return;

  row.dataset.bookingFilterTokens = assignment.length > 0 ? assignment : "open";
  row
    .querySelector<HTMLElement>("[data-month-booking-visual]")
    ?.replaceChildren(
      createVisualMark(assignment, categoryOptions, specialBudgetOptions),
    );
  row.dispatchEvent(
    new CustomEvent("month-booking-filter-row-updated", { bubbles: true }),
  );
}

function progressBackground(
  budgetCents: number | null,
  spentCents: number,
): string {
  if (budgetCents === null || budgetCents <= 0) {
    return "linear-gradient(90deg, #CBD5E1, #E2E8F0)";
  }

  const percent = Math.max(
    0,
    Math.round((Math.max(0, spentCents) / budgetCents) * 100),
  );

  if (spentCents > budgetCents) {
    return "linear-gradient(90deg, #F87171, #FB7185)";
  }

  if (percent >= 90) {
    return "linear-gradient(90deg, #FB923C, #FDBA74)";
  }

  if (percent >= 70) {
    return "linear-gradient(90deg, #FACC15, #FDE68A)";
  }

  return "linear-gradient(90deg, #34D399, #5EEAD4)";
}

function updateLiveOverviewRow(row: HTMLElement, deltaCents: number): void {
  const currentSpentCents = Number.parseInt(
    row.dataset.liveSpentCents ?? "0",
    10,
  );
  const rawBudgetCents = row.dataset.liveBudgetCents ?? "";
  const budgetCents =
    rawBudgetCents.length > 0 ? Number.parseInt(rawBudgetCents, 10) : null;
  const spentCents = currentSpentCents + deltaCents;
  const progressPercent =
    budgetCents === null || budgetCents <= 0
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            Math.round((Math.max(0, spentCents) / budgetCents) * 100),
          ),
        );

  row.dataset.liveSpentCents = String(spentCents);

  const amount = row.querySelector<HTMLElement>("[data-live-amount]");
  if (amount) {
    amount.textContent =
      budgetCents !== null && budgetCents > 0
        ? `${formatEuro(spentCents)} von ${formatEuro(budgetCents)}`
        : formatEuro(spentCents);
  }

  const progress = row.querySelector<HTMLElement>("[data-live-progress]");
  if (progress) {
    progress.style.width = `${progressPercent}%`;
    progress.style.background = progressBackground(budgetCents, spentCents);
  }

  const usageLabel = row.querySelector<HTMLElement>("[data-live-usage-label]");
  if (usageLabel && budgetCents !== null && budgetCents > 0) {
    usageLabel.textContent = `${Math.max(
      0,
      Math.round((Math.max(0, spentCents) / budgetCents) * 100),
    )}% genutzt`;
  }
}

function updateLiveAssignmentOverview(
  previousAssignment: string,
  assignment: string,
  amountCents: number,
): void {
  const expenseCents = Math.abs(amountCents);
  const previous = parseAssignment(previousAssignment);
  const next = parseAssignment(assignment);

  if (previous?.type === "category") {
    const row = document.querySelector<HTMLElement>(
      `[data-live-category-id="${previous.id}"]`,
    );
    if (row) updateLiveOverviewRow(row, -expenseCents);
  }

  if (previous?.type === "specialBudget") {
    const row = document.querySelector<HTMLElement>(
      `[data-live-special-budget-id="${previous.id}"]`,
    );
    if (row) updateLiveOverviewRow(row, -expenseCents);
  }

  if (next?.type === "category") {
    const row = document.querySelector<HTMLElement>(
      `[data-live-category-id="${next.id}"]`,
    );
    if (row) updateLiveOverviewRow(row, expenseCents);
  }

  if (next?.type === "specialBudget") {
    const row = document.querySelector<HTMLElement>(
      `[data-live-special-budget-id="${next.id}"]`,
    );
    if (row) updateLiveOverviewRow(row, expenseCents);
  }
}

export function DirectAssignmentSelect({
  amountCents,
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
  const [isPending, setIsPending] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const latestAssignmentRef = useRef(currentAssignment);
  const pendingAssignmentRef = useRef<string | null>(null);
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

  async function updateAssignment(assignment: string): Promise<void> {
    if (
      assignment === latestAssignmentRef.current ||
      assignment === pendingAssignmentRef.current
    ) {
      return;
    }

    const previousAssignment = latestAssignmentRef.current;

    latestAssignmentRef.current = assignment;
    pendingAssignmentRef.current = assignment;
    setSelectedAssignment(assignment);
    setSavedAssignment(assignment);
    setError(null);
    setIsPending(true);
    updateLiveAssignmentOverview(previousAssignment, assignment, amountCents);
    updateLiveBookingPresentation(
      selectRef.current,
      assignment,
      categoryOptions,
      specialBudgetOptions,
    );

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
      latestAssignmentRef.current = previousAssignment;
      updateLiveAssignmentOverview(assignment, previousAssignment, amountCents);
      updateLiveBookingPresentation(
        selectRef.current,
        previousAssignment,
        categoryOptions,
        specialBudgetOptions,
      );
      setSelectedAssignment(previousAssignment);
      setSavedAssignment(previousAssignment);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Zuordnung konnte nicht gespeichert werden.",
      );
    } finally {
      pendingAssignmentRef.current = null;
      setIsPending(false);
    }
  }

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <span className="relative inline-flex max-w-full">
        <select
          ref={selectRef}
          name="assignment"
          value={selectedAssignment}
          aria-label="Kategoriezuordnung direkt ändern"
          aria-busy={isPending}
          className={`max-w-full appearance-none rounded-full border py-1 pl-2.5 pr-7 text-xs font-black shadow-[0_8px_18px_rgba(7,27,70,0.035)] transition hover:-translate-y-0.5 focus:outline-none disabled:cursor-wait disabled:opacity-75 ${assignmentTone}`}
          disabled={isPending}
          onInput={(event) => void updateAssignment(event.currentTarget.value)}
          onChange={(event) => void updateAssignment(event.target.value)}
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
                  {budget.iconName ? `${budget.iconName} ` : ""}
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
