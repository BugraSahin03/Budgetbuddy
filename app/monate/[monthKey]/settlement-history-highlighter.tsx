"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function SettlementHistoryHighlighter({
  children,
}: {
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    for (const row of container.querySelectorAll<HTMLElement>(
      "[data-settlement-group-id]",
    )) {
      row.classList.toggle(
        "month-settlement-member-highlight",
        activeGroupId !== null &&
          row.dataset.settlementGroupId === activeGroupId,
      );
    }

    for (const trigger of container.querySelectorAll<HTMLButtonElement>(
      "[data-settlement-focus-trigger]",
    )) {
      const isActive =
        activeGroupId !== null &&
        trigger.dataset.settlementFocusTrigger === activeGroupId;
      trigger.classList.toggle("month-settlement-focus-active", isActive);
      trigger.setAttribute("aria-pressed", String(isActive));
    }
  }, [activeGroupId]);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const trigger = target.closest<HTMLButtonElement>(
      "[data-settlement-focus-trigger]",
    );
    if (!trigger || !containerRef.current?.contains(trigger)) return;

    const groupId = trigger.dataset.settlementFocusTrigger;
    if (!groupId) return;

    const nextGroupId = activeGroupId === groupId ? null : groupId;
    setActiveGroupId(nextGroupId);

    if (nextGroupId !== null) {
      window.setTimeout(() => {
        containerRef.current
          ?.querySelector<HTMLElement>(
            `[data-settlement-group-id="${nextGroupId}"]`,
          )
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  }

  return (
    <div ref={containerRef} onClick={handleClick}>
      {children}
    </div>
  );
}
