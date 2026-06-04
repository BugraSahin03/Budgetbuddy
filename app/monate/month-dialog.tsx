"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

type MonthDialogProps = {
  title: string;
  eyebrow: string;
  description?: string;
  triggerLabel: string;
  triggerClassName?: string;
  children: ReactNode;
};

export function MonthDialog({
  title,
  eyebrow,
  description,
  triggerLabel,
  triggerClassName,
  children,
}: MonthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={triggerClassName ?? "month-dialog-trigger"}
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog ref={dialogRef} className="month-dialog">
        <div className="month-dialog-surface">
          <div className="flex flex-col gap-4 border-b border-[color:var(--month-line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="month-eyebrow">{eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                {title}
              </h2>
              {description ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--month-ink-soft)]">
                  {description}
                </p>
              ) : null}
            </div>
            <form method="dialog">
              <button type="submit" className="month-dialog-close" aria-label="Dialog schliessen">
                Schliessen
              </button>
            </form>
          </div>
          <div className="mt-6 max-h-[70vh] overflow-y-auto pr-1">{children}</div>
        </div>
      </dialog>
    </>
  );
}
