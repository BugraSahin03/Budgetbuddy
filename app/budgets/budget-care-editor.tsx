"use client";

import { type ReactNode, useId, useState } from "react";

import { CategoryVisualMark } from "@/app/components/category-visual";

type BudgetEditorCategory = {
  id: number;
  name: string;
  colorHex: string | null;
  iconName: string | null;
  isDefault: boolean;
  isActive: boolean;
  monthlyBudgetCount: number;
  transactionCount: number;
  defaultBudgetAmountCents: number | null;
};

type BudgetCareEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: BudgetEditorCategory[];
  sidePanel: ReactNode;
};

function toInputAmount(amountCents: number | null): string {
  if (amountCents === null) {
    return "";
  }

  return (amountCents / 100).toFixed(2);
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function statusBadgeTone(isActive: boolean): string {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function defaultBudgetLabel(amountCents: number | null): string {
  return amountCents === null ? "Kein Standardwert" : formatEuro(amountCents);
}

export function BudgetCareEditor({
  action,
  categories,
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
        {isEditing ? (
          <form
            key="budget-edit-form"
            id={formId}
            action={action}
            className="budget-category-editor-form"
            onSubmit={() => setIsEditing(false)}
          >
            {categories.map((category) => (
              <article key={category.id} className="budget-pot-card">
                <input type="hidden" name="categoryIds" value={category.id} />
                <input type="hidden" name={`colorHex-${category.id}`} value={category.colorHex ?? ""} />
                <div className="budget-pot-main">
                  <CategoryVisualMark
                    name={category.name}
                    iconName={category.iconName}
                    colorHex={category.colorHex}
                    variant="neutral"
                    className="budget-pot-icon"
                  />
                  <div className="budget-pot-copy">
                    <div className="budget-pot-title-row">
                      <h3>{category.name}</h3>
                      <span className={`budget-badge ${statusBadgeTone(category.isActive)}`}>
                        {category.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                      {category.isDefault ? (
                        <span className="budget-badge border-sky-200 bg-sky-50 text-sky-700">
                          Standard
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {category.transactionCount} Buchungen · {category.monthlyBudgetCount} Monatswerte
                    </p>
                  </div>
                </div>

                <div className="budget-category-edit-panel">
                  <label>
                    Standardbudget
                    <input
                      name={`budgetAmount-${category.id}`}
                      inputMode="decimal"
                      defaultValue={toInputAmount(category.defaultBudgetAmountCents)}
                      placeholder="0.00"
                    />
                  </label>
                  <label>
                    Name
                    <input
                      name={`name-${category.id}`}
                      required
                      maxLength={60}
                      defaultValue={category.name}
                    />
                  </label>
                  <label>
                    Icon
                    <input
                      name={`iconName-${category.id}`}
                      maxLength={24}
                      defaultValue={category.iconName ?? ""}
                    />
                  </label>
                  <div className="budget-category-edit-flags">
                    <label className="budget-dialog-check">
                      <input
                        type="checkbox"
                        name={`isDefault-${category.id}`}
                        defaultChecked={category.isDefault}
                      />
                      Standard
                    </label>
                    <label className="budget-dialog-check">
                      <input
                        type="checkbox"
                        name={`isActive-${category.id}`}
                        defaultChecked={category.isActive}
                      />
                      Aktiv
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </form>
        ) : (
          <div
            key="budget-readonly-list"
            className="budget-category-editor-form"
            aria-label="Budgettoepfe"
          >
            {categories.map((category) => (
              <article key={category.id} className="budget-pot-card">
                <div className="budget-pot-main">
                  <CategoryVisualMark
                    name={category.name}
                    iconName={category.iconName}
                    colorHex={category.colorHex}
                    variant="neutral"
                    className="budget-pot-icon"
                  />
                  <div className="budget-pot-copy">
                    <div className="budget-pot-title-row">
                      <h3>{category.name}</h3>
                      <span className={`budget-badge ${statusBadgeTone(category.isActive)}`}>
                        {category.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                      {category.isDefault ? (
                        <span className="budget-badge border-sky-200 bg-sky-50 text-sky-700">
                          Standard
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {category.transactionCount} Buchungen · {category.monthlyBudgetCount} Monatswerte
                    </p>
                  </div>
                </div>

                <div className="budget-pot-readonly-value">
                  <span>Standardbudget</span>
                  <strong>{defaultBudgetLabel(category.defaultBudgetAmountCents)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
        <div key="budget-side-panel" className="budget-side-slot">
          {sidePanel}
        </div>
      </div>
    </div>
  );
}
