"use client";

import { type ReactNode, useId, useState } from "react";

type BudgetCareEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  sidePanel: ReactNode;
};

export function BudgetCareEditor({
  action,
  children,
  sidePanel,
}: BudgetCareEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const formId = useId();

  return (
    <div className={`budget-care-editor ${isEditing ? "is-editing" : ""}`}>
      <div className="budget-care-header">
        <h2>Kategorien und Sonderbudgets</h2>
        <div className="budget-care-actions">
          {isEditing ? (
            <button
              type="submit"
              form={formId}
              className="budget-icon-action budget-icon-action-save"
              aria-label="Aenderungen speichern und Editiermodus beenden"
              title="Speichern"
            >
              ✓
            </button>
          ) : (
            <button
              type="button"
              className="budget-icon-action"
              aria-label="Editiermodus starten"
              title="Editieren"
              onClick={() => setIsEditing(true)}
            >
              ✎
            </button>
          )}
        </div>
      </div>

      <div className="budget-care-grid">
        <form
          id={formId}
          action={action}
          className="budget-category-editor-form"
          onSubmit={() => setIsEditing(false)}
        >
          {children}
        </form>
        {sidePanel}
      </div>
    </div>
  );
}
