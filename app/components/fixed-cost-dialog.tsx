"use client";

import { type ReactNode, useRef } from "react";

type FixedCostDialogProps = {
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function FixedCostDialog({
  triggerLabel,
  triggerAriaLabel,
  triggerClassName = "budget-dialog-trigger",
  eyebrow,
  title,
  children,
}: FixedCostDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={triggerAriaLabel ?? triggerLabel}
        className={triggerClassName}
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog ref={dialogRef} className="budget-dialog">
        <div className="budget-dialog-surface">
          <form method="dialog" className="budget-dialog-close-row">
            <button type="submit" className="budget-dialog-close" aria-label="Dialog schließen">
              ×
            </button>
          </form>
          <div className="budget-dialog-header">
            <p>{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
