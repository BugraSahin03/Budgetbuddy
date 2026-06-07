import { createBudgetCategoryAction, updateBudgetCategoriesAction } from "@/app/budgets/actions";
import { BudgetCareEditor } from "@/app/budgets/budget-care-editor";
import { BudgetCreateTabs } from "@/app/budgets/budget-create-tabs";
import { BudgetDialog } from "@/app/budgets/budget-dialog";
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
  const editorCategories = categories.map((category) => ({
    ...category,
    defaultBudgetAmountCents:
      budgetByCategoryId.get(category.id)?.defaultBudgetAmountCents ?? null,
  }));
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
            <BudgetCreateTabs
              categoryForm={
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
              }
              specialBudgetForm={
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
              }
            />
          </BudgetDialog>
        </div>
      </header>

      {notice ? <p className="budget-feedback budget-feedback-success">{notice}</p> : null}
      {error ? <p className="budget-feedback budget-feedback-error">{error}</p> : null}

      <section className="budget-care-shell">
        <BudgetCareEditor
          action={updateBudgetCategoriesAction}
          categories={editorCategories}
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
        />
      </section>
    </section>
  );
}
