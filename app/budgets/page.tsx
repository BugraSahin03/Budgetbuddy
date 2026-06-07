import { createBudgetCategoryAction, updateBudgetCategoriesAction } from "@/app/budgets/actions";
import { BudgetCareEditor } from "@/app/budgets/budget-care-editor";
import { BudgetDialog } from "@/app/budgets/budget-dialog";
import { CategoryVisualMark } from "@/app/components/category-visual";
import {
  createSpecialBudgetAction,
  updateSpecialBudgetStateAction,
} from "@/app/sonderbudgets/actions";
import { listCategoryBudgetDefaults } from "@/src/budgets/repository";
import { listCategories } from "@/src/categories/repository";
import {
  getSelectableMonthKeys,
  listSpecialBudgets,
} from "@/src/special-budgets/repository";

export const dynamic = "force-dynamic";

type BudgetsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function toInputAmount(amountCents: number | null): string {
  if (amountCents === null) {
    return "";
  }

  return (amountCents / 100).toFixed(2);
}

function statusBadgeTone(isActive: boolean): string {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function formatMonthLabel(monthKey: string): string {
  const [rawYear, rawMonth] = monthKey.split("-");
  const year = Number.parseInt(rawYear, 10);
  const month = Number.parseInt(rawMonth, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }

  const date = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function specialBudgetStatusTone(isActive: boolean, remainingCents: number): string {
  if (!isActive) {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  if (remainingCents < 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (remainingCents === 0) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function specialBudgetStatusLabel(isActive: boolean, remainingCents: number): string {
  if (!isActive) {
    return "Inaktiv";
  }

  if (remainingCents < 0) {
    return "Ueberschritten";
  }

  if (remainingCents === 0) {
    return "Ausgereizt";
  }

  return "Im Rahmen";
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const categories = listCategories();
  const budgetRows = listCategoryBudgetDefaults();
  const budgetByCategoryId = new Map(budgetRows.map((row) => [row.categoryId, row]));
  const selectableMonths = getSelectableMonthKeys();
  const selectedMonthKey =
    toSingleParam(params.monthKey) ??
    selectableMonths[0] ??
    new Date().toISOString().slice(0, 7);
  const specialBudgets = listSpecialBudgets();
  const activeCategoryCount = categories.filter((category) => category.isActive).length;
  const categoriesWithBudgetCount = budgetRows.filter(
    (row) => row.defaultBudgetAmountCents !== null,
  ).length;
  const activeSpecialBudgetCount = specialBudgets.filter((budget) => budget.isActive).length;

  return (
    <section className="space-y-5">
      <header className="budget-hero-panel">
        <div className="budget-hero-copy">
          <p>Budgetpflege</p>
          <h1>Budgettoepfe und Standardwerte</h1>
          <span>
            Kategorie = wofuer du Geld ausgibst. Budget = wie viel du dafuer einplanst.
            Sonderbudgets bleiben eigene Monatstoepfe fuer besondere Zwecke.
          </span>
        </div>

        <div className="budget-hero-actions">
          <div className="budget-hero-stat">
            <strong>{activeCategoryCount}</strong>
            <span>aktive Budgettoepfe</span>
          </div>
          <div className="budget-hero-stat">
            <strong>{categoriesWithBudgetCount}</strong>
            <span>mit Standardwert</span>
          </div>
          <BudgetDialog
            triggerLabel="+"
            triggerAriaLabel="Kategorie oder Sonderbudget anlegen"
            triggerClassName="budget-dialog-plus"
            eyebrow="Neuer Eintrag"
            title="Kategorie oder Sonderbudget anlegen"
            description="Lege entweder einen dauerhaften Budgettopf oder einen besonderen Monatstopf an."
          >
            <div className="budget-create-tabs">
              <input
                type="radio"
                id="budget-create-category-tab"
                name="budget-create-tab"
                defaultChecked
              />
              <input
                type="radio"
                id="budget-create-special-tab"
                name="budget-create-tab"
              />
              <label htmlFor="budget-create-category-tab">Kategorien</label>
              <label htmlFor="budget-create-special-tab">Sonderbudgets</label>

              <section className="budget-create-dialog-group budget-create-category-panel">
                <h3>Kategorie erstellen</h3>
                <p>Dauerhafter Budgettopf fuer regelmaessige Ausgaben.</p>
                <form action={createBudgetCategoryAction} className="budget-dialog-form">
                  <label>
                    Name
                    <input
                      name="name"
                      required
                      maxLength={60}
                      placeholder="Zum Beispiel Lebensmittel"
                    />
                  </label>
                  <label>
                    Icon
                    <input
                      name="iconName"
                      maxLength={24}
                      placeholder="Zum Beispiel Einkaufswagen oder L"
                    />
                  </label>
                  <label>
                    Standardbudget
                    <input
                      name="budgetAmount"
                      inputMode="decimal"
                      placeholder="Zum Beispiel 350.00"
                      aria-describedby="new-budget-help"
                    />
                    <span id="new-budget-help">Optionaler Betrag fuer neue Monate.</span>
                  </label>
                  <input type="hidden" name="colorHex" value="" />
                  <label className="budget-dialog-check">
                    <input type="checkbox" name="isDefault" defaultChecked />
                    In Standardlisten anzeigen
                  </label>
                  <button type="submit" className="budget-primary-button">
                    Kategorie speichern
                  </button>
                </form>
              </section>

              <section className="budget-create-dialog-group budget-create-special-panel">
                <h3>Sonderbudget erstellen</h3>
                <p>Monatstopf fuer einmalige oder besondere Ausgaben.</p>
                <form action={createSpecialBudgetAction} className="budget-dialog-form">
                  <label>
                    Name
                    <input name="name" required maxLength={80} placeholder="Zum Beispiel Urlaub" />
                  </label>
                  <label>
                    Monat
                    <select name="monthKey" defaultValue={selectedMonthKey}>
                      {selectableMonths.map((monthKey) => (
                        <option key={monthKey} value={monthKey}>
                          {formatMonthLabel(monthKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Geplanter Betrag
                    <input name="plannedAmount" required inputMode="decimal" placeholder="500.00" />
                  </label>
                  <label>
                    Notiz
                    <input name="note" maxLength={240} placeholder="Optional" />
                  </label>
                  <button type="submit" className="budget-primary-button">
                    Sonderbudget speichern
                  </button>
                </form>
              </section>
            </div>
          </BudgetDialog>
        </div>
      </header>

      {notice ? <p className="budget-feedback budget-feedback-success">{notice}</p> : null}
      {error ? <p className="budget-feedback budget-feedback-error">{error}</p> : null}

      <section className="budget-care-shell">
        <BudgetCareEditor
          action={updateBudgetCategoriesAction}
          sidePanel={
            <aside className="budget-special-panel" aria-label="Sonderbudgets">
              <div className="budget-special-header">
                <p>Sonderbudgets</p>
                <strong>{activeSpecialBudgetCount}</strong>
                <span>aktive Monatstoepfe</span>
              </div>

              <div className="budget-special-list">
                {specialBudgets.map((budget) => {
                  const remainingCents = budget.plannedAmountCents - budget.actualExpenseCents;

                  return (
                    <article key={budget.id} className="budget-special-card">
                      <div>
                        <p>{formatMonthLabel(budget.monthKey)}</p>
                        <h3>{budget.name}</h3>
                        {budget.note ? <span>{budget.note}</span> : null}
                      </div>
                      <div className="budget-special-values">
                        <span>{formatEuro(budget.actualExpenseCents)} genutzt</span>
                        <strong>{formatEuro(budget.plannedAmountCents)}</strong>
                        <small className={`budget-badge ${specialBudgetStatusTone(budget.isActive, remainingCents)}`}>
                          {specialBudgetStatusLabel(budget.isActive, remainingCents)}
                        </small>
                      </div>
                      <form action={updateSpecialBudgetStateAction}>
                        <input type="hidden" name="specialBudgetId" value={budget.id} />
                        <button type="submit" name="intent" value={budget.isActive ? "deactivate" : "reactivate"}>
                          {budget.isActive ? "Deaktivieren" : "Reaktivieren"}
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            </aside>
          }
        >
          {categories.map((category) => {
            const budgetRow = budgetByCategoryId.get(category.id);
            const defaultBudgetAmountCents = budgetRow?.defaultBudgetAmountCents ?? null;
            const defaultBudgetLabel = defaultBudgetAmountCents === null
              ? "Kein Standardwert"
              : formatEuro(defaultBudgetAmountCents);

            return (
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

                <div className="budget-pot-readonly-value">
                  <span>Standardbudget</span>
                  <strong>{defaultBudgetLabel}</strong>
                </div>

                <div className="budget-category-edit-panel">
                  <label>
                    Standardbudget
                    <input
                      name={`budgetAmount-${category.id}`}
                      inputMode="decimal"
                      defaultValue={toInputAmount(defaultBudgetAmountCents)}
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
            );
          })}
        </BudgetCareEditor>
      </section>
    </section>
  );
}
