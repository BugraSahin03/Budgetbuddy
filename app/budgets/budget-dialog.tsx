"use client";

import { type ReactNode, useRef } from "react";

type BudgetDialogProps = {
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function BudgetDialog({
  triggerLabel,
  triggerAriaLabel,
  triggerClassName = "budget-dialog-trigger",
  eyebrow,
  title,
  description,
  children,
}: BudgetDialogProps) {
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
            <button type="submit" className="budget-dialog-close" aria-label="Dialog schliessen">
              ×
            </button>
          </form>
          <div className="budget-dialog-header">
            <p>{eyebrow}</p>
            <h2>{title}</h2>
            {description ? <span>{description}</span> : null}
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
