"use client";

import { useState } from "react";

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
  specialBudgetAction: (formData: FormData) => void | Promise<void>;
  specialBudgets: BudgetEditorSpecialBudget[];
};

type BudgetEditorSpecialBudget = {
  projectId: number;
  name: string;
  iconName: string | null;
  note: string | null;
  monthShares: Array<{
    id: number;
    monthKey: string;
    plannedAmountCents: number;
    actualExpenseCents: number;
    isActive: boolean;
  }>;
  monthCount: number;
  plannedAmountCents: number;
  actualExpenseCents: number;
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

function defaultBudgetLabel(amountCents: number | null): string {
  return amountCents === null ? "Kein Betrag" : formatEuro(amountCents);
}

function formatMonthLabel(monthKey: string): string {
  const [rawYear, rawMonth] = monthKey.split("-");
  const year = Number.parseInt(rawYear, 10);
  const month = Number.parseInt(rawMonth, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function BudgetCareEditor({
  action,
  categories,
  specialBudgetAction,
  specialBudgets,
}: BudgetCareEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingInactiveCategoryIds, setPendingInactiveCategoryIds] = useState<number[]>([]);
  const visibleCategories = categories.filter(
    (category) => !pendingInactiveCategoryIds.includes(category.id),
  );

  if (isEditing) {
    return (
      <div className="budget-care-editor is-editing">
        <form action={action} onSubmit={() => setIsEditing(false)}>
          <div className="budget-care-header">
            <h2>Kategorien</h2>
            <div className="budget-care-actions">
              <button
                type="submit"
                className="budget-icon-action budget-icon-action-save"
                aria-label="Aenderungen speichern und Editiermodus beenden"
                title="Speichern"
              >
                ✓
              </button>
            </div>
          </div>

          <div className="budget-care-grid">
            <div
              key="budget-edit-list"
              className="budget-category-editor-form"
            aria-label="Kategorien bearbeiten"
          >
              {categories.map((category) => {
                if (!pendingInactiveCategoryIds.includes(category.id)) {
                  return null;
                }

                return (
                  <div key={`inactive-${category.id}`}>
                    <input type="hidden" name="categoryIds" value={category.id} />
                    <input type="hidden" name={`colorHex-${category.id}`} value={category.colorHex ?? ""} />
                    <input type="hidden" name={`budgetAmount-${category.id}`} value={toInputAmount(category.defaultBudgetAmountCents)} />
                    <input type="hidden" name={`name-${category.id}`} value={category.name} />
                    <input type="hidden" name={`iconName-${category.id}`} value={category.iconName ?? ""} />
                    {category.isDefault ? (
                      <input type="hidden" name={`isDefault-${category.id}`} value="on" />
                    ) : null}
                  </div>
                );
              })}
              {visibleCategories.map((category) => (
                <article key={category.id} className="budget-pot-card">
                  <input type="hidden" name="categoryIds" value={category.id} />
                  <input type="hidden" name={`colorHex-${category.id}`} value={category.colorHex ?? ""} />
                  {category.isDefault ? (
                    <input type="hidden" name={`isDefault-${category.id}`} value="on" />
                  ) : null}
                  {category.isActive ? (
                    <input type="hidden" name={`isActive-${category.id}`} value="on" />
                  ) : null}

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
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="budget-secondary-action"
                    onClick={() =>
                      setPendingInactiveCategoryIds((currentIds) => [...currentIds, category.id])
                    }
                  >
                    Deaktivieren
                  </button>

                  <div className="budget-category-edit-panel">
                    <label>
                      Betrag
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
                        maxLength={2}
                        defaultValue={category.iconName ?? ""}
                        placeholder="EI"
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
            <SpecialBudgetList
              action={specialBudgetAction}
              isEditing={true}
              specialBudgets={specialBudgets}
            />
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="budget-care-editor">
      <div className="budget-care-header">
        <h2>Kategorien</h2>
        <div className="budget-care-actions">
          <button
            type="button"
            className="budget-icon-action"
            aria-label="Editiermodus starten"
            title="Editieren"
            onClick={() => setIsEditing(true)}
          >
            ✎
          </button>
        </div>
      </div>

      <div className="budget-care-grid">
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
                  </div>
                </div>
              </div>

              <div className="budget-pot-readonly-value">
                <strong>{defaultBudgetLabel(category.defaultBudgetAmountCents)}</strong>
              </div>
            </article>
          ))}
        </div>
        <SpecialBudgetList
          action={specialBudgetAction}
          isEditing={false}
          specialBudgets={specialBudgets}
        />
      </div>
    </div>
  );
}

function SpecialBudgetList({
  action,
  isEditing,
  specialBudgets,
}: {
  action: (formData: FormData) => void | Promise<void>;
  isEditing: boolean;
  specialBudgets: BudgetEditorSpecialBudget[];
}) {
  return (
    <section className="budget-section-list" aria-label="Sonderbudgets">
      <h3 className="budget-section-heading">Sonderbudgets</h3>
      <div className="budget-special-list">
        {specialBudgets.map((budget) => {
          const content = (
            <>
            <div className="budget-pot-main">
              <CategoryVisualMark
                name={budget.name}
                iconName={budget.iconName}
                colorHex={null}
                variant="neutral"
                className="budget-pot-icon"
              />
              <div className="budget-pot-copy">
                <div className="budget-pot-title-row">
                  <h3>{budget.name}</h3>
                </div>
                <p>{budget.monthCount} Monatsanteile</p>
                <div className="flex flex-wrap gap-2">
                  {budget.monthShares.map((share) => (
                    <span key={share.id} className="month-chip month-chip-neutral">
                      {formatMonthLabel(share.monthKey)} · {formatEuro(share.plannedAmountCents)}
                    </span>
                  ))}
                </div>
                {budget.note ? <p>{budget.note}</p> : null}
              </div>
            </div>

            <div className="budget-pot-readonly-value">
              <strong>{formatEuro(budget.plannedAmountCents)}</strong>
              <span>Ist {formatEuro(budget.actualExpenseCents)}</span>
            </div>

            {isEditing ? (
              <>
                <input type="hidden" name="specialBudgetProjectIds" value={budget.projectId} />
                {budget.monthShares.map((share) => (
                  <input
                    key={`share-${share.id}`}
                    type="hidden"
                    name={`specialBudgetShareIds-${budget.projectId}`}
                    value={share.id}
                  />
                ))}
                <div className="budget-category-edit-panel budget-special-edit-panel">
                  <label>
                    Icon
                    <input
                      name={`specialBudgetIconName-${budget.projectId}`}
                      maxLength={24}
                      defaultValue={budget.iconName ?? ""}
                      placeholder="Optional"
                    />
                  </label>
                  {budget.monthShares.map((share) => (
                    <label key={share.id}>
                      {formatMonthLabel(share.monthKey)}
                      <input
                        name={`plannedAmount-${share.id}`}
                        inputMode="decimal"
                        required
                        defaultValue={toInputAmount(share.plannedAmountCents)}
                        placeholder="0.00"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  formAction={action}
                  name="intent"
                  value={`deactivateProject:${budget.projectId}`}
                  className="budget-secondary-action budget-special-deactivate-action"
                >
                  Deaktivieren
                </button>
              </>
            ) : null}
            </>
          );

          if (isEditing) {
            return (
              <article
                key={budget.projectId}
                className="budget-pot-card budget-special-pot-card budget-special-edit-form"
              >
                {content}
              </article>
            );
          }

          return (
            <article key={budget.projectId} className="budget-pot-card budget-special-pot-card">
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
