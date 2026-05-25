import {
  createImportRuleAction,
  updateImportRuleAction,
} from "@/app/import/actions";
import { ImportForm } from "@/app/import/import-form";
import { listActiveCategoryOptions } from "@/src/transactions/repository";
import { listSpecialBudgets } from "@/src/special-budgets/repository";
import { listImportRules } from "@/src/import-rules/repository";

type ImportPageProps = {
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

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const categories = listActiveCategoryOptions();
  const specialBudgets = listSpecialBudgets().filter((item) => item.isActive);
  const rules = listImportRules();

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Import</p>
        <h2 className="text-lg font-semibold text-slate-900">Sparkassen-CSV Vorschau</h2>
        <p className="mt-1 text-sm text-slate-600">
          CSV-Datei einlesen und relevante Felder gemaess FIN-010 vor dem spaeteren Import pruefen.
        </p>
      </header>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ImportForm />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Regelvorschlaege</p>
          <h3 className="text-base font-semibold text-slate-900">Import-Regel anlegen</h3>
          <p className="text-sm text-slate-600">
            Regeln schlagen Kategorie, Sonderbudget oder Transfer-Buchungen fuer passende Buchungen vor.
          </p>
        </div>

        <form action={createImportRuleAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-name">
              Name
            </label>
            <input id="rule-name" name="name" required maxLength={80} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="xl:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-pattern">
              Suchmuster
            </label>
            <input id="rule-pattern" name="pattern" required maxLength={120} placeholder="z. B. REWE" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-match-field">
              Feld
            </label>
            <select id="rule-match-field" name="matchField" defaultValue="combined" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="combined">Beschreibung + Gegenpartei</option>
              <option value="description">Beschreibung</option>
              <option value="counterparty">Gegenpartei</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-target-type">
              Zieltyp
            </label>
            <select id="rule-target-type" name="targetType" defaultValue="category" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="category">Kategorie</option>
              <option value="special_budget">Sonderbudget</option>
              <option value="transfer_cash">Transfer Bargeld</option>
            </select>
          </div>

          <div className="xl:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-priority">
              Prioritaet
            </label>
            <input id="rule-priority" name="priority" type="number" min={1} max={999} defaultValue={100} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-category">
              Kategorie
            </label>
            <select id="rule-category" name="categoryId" defaultValue="" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">-</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="rule-special-budget">
              Sonderbudget
            </label>
            <select id="rule-special-budget" name="specialBudgetId" defaultValue="" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">-</option>
              {specialBudgets.map((budget) => (
                <option key={budget.id} value={budget.id}>{budget.name} ({budget.monthKey})</option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-1 flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
              Aktiv
            </label>
          </div>

          <div className="xl:col-span-2 flex items-end">
            <button type="submit" className="w-full rounded border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200">
              Regel erstellen
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Vorhandene Regeln</h3>

        {rules.length === 0 ? (
          <p className="text-sm text-slate-600">Noch keine Import-Regeln vorhanden.</p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <form action={updateImportRuleAction} className="grid gap-2 md:grid-cols-2 xl:grid-cols-12">
                  <input type="hidden" name="ruleId" value={rule.id} />

                  <input name="name" defaultValue={rule.name} className="xl:col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                  <input name="pattern" defaultValue={rule.pattern} className="xl:col-span-3 rounded border border-slate-300 px-2 py-1 text-xs" />

                  <select name="matchField" defaultValue={rule.matchField} className="xl:col-span-2 rounded border border-slate-300 px-2 py-1 text-xs">
                    <option value="combined">Beschreibung + Gegenpartei</option>
                    <option value="description">Beschreibung</option>
                    <option value="counterparty">Gegenpartei</option>
                  </select>

                  <select name="targetType" defaultValue={rule.targetType} className="xl:col-span-2 rounded border border-slate-300 px-2 py-1 text-xs">
                    <option value="category">Kategorie</option>
                    <option value="special_budget">Sonderbudget</option>
                    <option value="transfer_cash">Transfer Bargeld</option>
                  </select>

                  <input name="priority" type="number" min={1} max={999} defaultValue={rule.priority} className="xl:col-span-1 rounded border border-slate-300 px-2 py-1 text-xs" />

                  <select name="categoryId" defaultValue={rule.categoryId ?? ""} className="xl:col-span-1 rounded border border-slate-300 px-2 py-1 text-xs">
                    <option value="">-</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <select name="specialBudgetId" defaultValue={rule.specialBudgetId ?? ""} className="xl:col-span-1 rounded border border-slate-300 px-2 py-1 text-xs">
                    <option value="">-</option>
                    {specialBudgets.map((budget) => (
                      <option key={budget.id} value={budget.id}>{budget.name} ({budget.monthKey})</option>
                    ))}
                  </select>

                  <label className="xl:col-span-1 inline-flex items-center gap-1 text-xs text-slate-700">
                    <input type="checkbox" name="isActive" defaultChecked={rule.isActive} className="h-3.5 w-3.5" />
                    Aktiv
                  </label>

                  <button type="submit" className="xl:col-span-2 rounded border border-sky-300 bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-200">
                    Speichern
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
