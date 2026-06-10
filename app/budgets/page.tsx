import {
  createBudgetCategoryAction,
  createBudgetSpecialBudgetAction,
  updateBudgetCategoriesAction,
  updateBudgetSpecialBudgetStateAction,
} from "@/app/budgets/actions";
import { BudgetCareEditor } from "@/app/budgets/budget-care-editor";
import { BudgetCreateTabs } from "@/app/budgets/budget-create-tabs";
import { BudgetDialog } from "@/app/budgets/budget-dialog";
import { listCategoryBudgetDefaults } from "@/src/budgets/repository";
import { listCategories } from "@/src/categories/repository";
import {
  getSelectableMonthKeys,
  listActiveSpecialBudgetProjects,
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

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const categories = listCategories().filter((category) => category.isActive);
  const budgetRows = listCategoryBudgetDefaults();
  const budgetByCategoryId = new Map(budgetRows.map((row) => [row.categoryId, row]));
  const selectableMonths = getSelectableMonthKeys();
  const selectedMonthKey =
    toSingleParam(params.monthKey) ??
    selectableMonths[0] ??
    new Date().toISOString().slice(0, 7);
  const specialBudgets = listActiveSpecialBudgetProjects();
  const editorCategories = categories.map((category) => ({
    ...category,
    defaultBudgetAmountCents:
      budgetByCategoryId.get(category.id)?.defaultBudgetAmountCents ?? null,
  }));

  return (
    <section className="space-y-5">
      <header className="budget-hero-panel">
        <div className="budget-hero-copy">
          <p>Budgetpflege</p>
          <h1>Budgetpflege</h1>
        </div>

        <div className="budget-hero-actions">
          <BudgetDialog
            triggerLabel="+"
            triggerAriaLabel="Kategorie oder Sonderbudget anlegen"
            triggerClassName="budget-dialog-plus"
            eyebrow="Neuer Eintrag"
            title="Kategorie oder Sonderbudget anlegen"
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
                      maxLength={2}
                      placeholder="Zum Beispiel EI"
                    />
                  </label>
                  <label>
                    Betrag
                    <input
                      name="budgetAmount"
                      inputMode="decimal"
                      placeholder="Zum Beispiel 350.00"
                      aria-describedby="new-budget-help"
                    />
                    <span id="new-budget-help">Optionaler Betrag fuer neue Monate.</span>
                  </label>
                  <input type="hidden" name="colorHex" value="" />
                  <input type="hidden" name="isDefault" value="on" />
                  <button type="submit" className="budget-primary-button">
                    Kategorie speichern
                  </button>
                </form>
              }
              specialBudgetForm={
                <form action={createBudgetSpecialBudgetAction} className="budget-dialog-form">
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
                    Betrag
                    <input name="plannedAmount" required inputMode="decimal" placeholder="500.00" />
                  </label>
                  <fieldset className="budget-dialog-form">
                    <legend>Weitere Monatsanteile</legend>
                    <p>
                      Optional: Gleicher Name verbindet die Anteile zu einem mehrmonatigen Vorhaben.
                    </p>
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="grid gap-3 md:grid-cols-2">
                        <label>
                          Monat
                          <select name="additionalMonthKey" defaultValue="">
                            <option value="">Kein weiterer Monat</option>
                            {selectableMonths.map((monthKey) => (
                              <option key={monthKey} value={monthKey}>
                                {formatMonthLabel(monthKey)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Betrag
                          <input
                            name="additionalPlannedAmount"
                            inputMode="decimal"
                            placeholder="Optional"
                          />
                        </label>
                      </div>
                    ))}
                  </fieldset>
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
          specialBudgetAction={updateBudgetSpecialBudgetStateAction}
          specialBudgets={specialBudgets}
        />
      </section>
    </section>
  );
}
