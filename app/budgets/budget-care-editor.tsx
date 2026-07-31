"use client";

import { useState } from "react";

import { CategoryVisualMark } from "@/app/components/category-visual";

type BudgetEditorCategory = {
  id: number;
  name: string;
  colorHex: string | null;
  iconName: string | null;
  systemKey: string | null;
  isDefault: boolean;
  isActive: boolean;
  isProtected: boolean;
  isSavings: boolean;
  monthlyBudgetCount: number;
  transactionCount: number;
  defaultBudgetAmountCents: number | null;
};

type BudgetCareEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: BudgetEditorCategory[];
  initialIsEditing?: boolean;
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

function categoryBudgetLabel(category: BudgetEditorCategory): string {
  if (category.isSavings) {
    return "Kein Planwert";
  }

  return defaultBudgetLabel(category.defaultBudgetAmountCents);
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
  initialIsEditing = false,
  specialBudgets,
}: BudgetCareEditorProps) {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [changedCategoryIds, setChangedCategoryIds] = useState<number[]>([]);
  const [changedSpecialBudgetProjectIds, setChangedSpecialBudgetProjectIds] =
    useState<number[]>([]);

  function markCategoryChanged(categoryId: number): void {
    setChangedCategoryIds((currentIds) =>
      currentIds.includes(categoryId) ? currentIds : [...currentIds, categoryId],
    );
  }

  function markSpecialBudgetProjectChanged(projectId: number): void {
    setChangedSpecialBudgetProjectIds((currentIds) =>
      currentIds.includes(projectId) ? currentIds : [...currentIds, projectId],
    );
  }

  if (isEditing) {
    return (
      <div className="budget-care-editor is-editing">
        <form action={action}>
          <div className="budget-care-header">
            <h2>Kategorien</h2>
            <div className="budget-care-actions">
              <button
                type="submit"
                name="intent"
                value="saveChanges"
                className="budget-icon-action budget-icon-action-save"
                aria-label="Änderungen speichern und Editiermodus beenden"
                title="Speichern"
              >
                ✓
              </button>
            </div>
          </div>

          {changedCategoryIds.map((categoryId) => (
            <input
              key={`changed-category-${categoryId}`}
              type="hidden"
              name="changedCategoryIds"
              value={categoryId}
            />
          ))}
          {changedSpecialBudgetProjectIds.map((projectId) => (
            <input
              key={`changed-project-${projectId}`}
              type="hidden"
              name="changedSpecialBudgetProjectIds"
              value={projectId}
            />
          ))}

          <div className="budget-care-grid">
            <div
              key="budget-edit-list"
              className="budget-category-editor-form"
            aria-label="Kategorien bearbeiten"
          >
              {categories.map((category) => (
                <article key={category.id} className="budget-pot-card">
                  <input type="hidden" name={`colorHex-${category.id}`} value={category.colorHex ?? ""} />
                  {category.isSavings ? (
                    <>
                      <input type="hidden" name={`name-${category.id}`} value={category.name} />
                      <input type="hidden" name={`budgetAmount-${category.id}`} value="" />
                    </>
                  ) : null}
                  {category.isDefault || category.isSavings ? (
                    <input type="hidden" name={`isDefault-${category.id}`} value="on" />
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
                        {category.isSavings ? (
                          <span className="month-chip month-chip-neutral">
                            Geschuetzt
                          </span>
                        ) : null}
                      </div>
                      {category.isSavings ? (
                        <p>Systemkategorie für echte Sparbuchungen ohne Planwert.</p>
                      ) : null}
                    </div>
                  </div>

                  {!category.isProtected ? (
                    <button
                      type="submit"
                      name="intent"
                      value={`deactivateCategory:${category.id}`}
                      className="budget-secondary-action"
                    >
                      Deaktivieren
                    </button>
                  ) : null}

                  <div className="budget-category-edit-panel">
                    {category.isSavings ? (
                      <>
                        <label>
                          Icon
                          <input
                            name={`iconName-${category.id}`}
                            maxLength={2}
                            defaultValue={category.iconName ?? ""}
                            placeholder="↟"
                            onChange={() => markCategoryChanged(category.id)}
                          />
                        </label>
                        <div className="rounded-[1rem] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-semibold text-sky-950">
                          Sparen ist geschuetzt; nur das Icon ist editierbar.
                        </div>
                      </>
                    ) : (
                      <>
                        <label>
                          Betrag
                          <input
                            name={`budgetAmount-${category.id}`}
                            inputMode="decimal"
                            defaultValue={toInputAmount(category.defaultBudgetAmountCents)}
                            placeholder="0.00"
                            onChange={() => markCategoryChanged(category.id)}
                          />
                        </label>
                        <label>
                          Name
                          <input
                            name={`name-${category.id}`}
                            required
                            maxLength={60}
                            defaultValue={category.name}
                            onChange={() => markCategoryChanged(category.id)}
                          />
                        </label>
                        <label>
                          Icon
                          <input
                            name={`iconName-${category.id}`}
                            maxLength={2}
                            defaultValue={category.iconName ?? ""}
                            placeholder="EI"
                            onChange={() => markCategoryChanged(category.id)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <SpecialBudgetList
              isEditing={true}
              onProjectChange={markSpecialBudgetProjectChanged}
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
          aria-label="Kategorien und Sonderkategorien"
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
                <strong>{categoryBudgetLabel(category)}</strong>
              </div>
            </article>
          ))}
        </div>
        <SpecialBudgetList
          isEditing={false}
          specialBudgets={specialBudgets}
        />
      </div>
    </div>
  );
}

function SpecialBudgetList({
  isEditing,
  onProjectChange,
  specialBudgets,
}: {
  isEditing: boolean;
  onProjectChange?: (projectId: number) => void;
  specialBudgets: BudgetEditorSpecialBudget[];
}) {
  return (
    <section className="budget-section-list" aria-label="Sonderkategorien">
      <h3 className="budget-section-heading">Sonderkategorien</h3>
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
                      onChange={() => onProjectChange?.(budget.projectId)}
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
                        onChange={() => onProjectChange?.(budget.projectId)}
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  name="intent"
                  value={`archiveSpecialBudgetProject:${budget.projectId}`}
                  className="budget-secondary-action budget-special-deactivate-action"
                >
                  Archivieren
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
