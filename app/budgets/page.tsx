import { setCategoryDefaultBudgetAction } from "@/app/budgets/actions";
import { CategoryVisualMark } from "@/app/components/category-visual";
import { createCategoryAction, updateCategoryAction } from "@/app/kategorien/actions";
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

function categoryColorPreview(colorHex: string | null): string {
  return colorHex ?? "#CBD5E1";
}

function categoryVisualById(
  categories: ReturnType<typeof listCategories>,
): Map<number, { name: string; iconName: string | null; colorHex: string | null }> {
  return new Map(
    categories.map((category) => [
      category.id,
      {
        name: category.name,
        iconName: category.iconName,
        colorHex: category.colorHex,
      },
    ]),
  );
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

function SectionHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <header className="border-b border-slate-100 pb-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{copy}</p>
    </header>
  );
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const categories = listCategories();
  const categoryVisuals = categoryVisualById(categories);
  const budgetRows = listCategoryBudgetDefaults();
  const selectableMonths = getSelectableMonthKeys();
  const selectedMonthKey =
    toSingleParam(params.monthKey) ??
    selectableMonths[0] ??
    new Date().toISOString().slice(0, 7);
  const specialBudgets = listSpecialBudgets();

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Verwaltung
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              Kategorien, Budgets und Sonderbudgets gemeinsam pflegen
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Diese Verwaltungsseite buendelt die bisherigen Einzelbereiche in einer ruhigeren
              Oberflaeche. Die bestehende Fachlogik bleibt erhalten, die Navigation wird aber
              kompakter.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="#kategorien"
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700"
            >
              Kategorien
            </a>
            <a
              href="#standardbudgets"
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700"
            >
              Standardbudgets
            </a>
            <a
              href="#sonderbudgets"
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700"
            >
              Sonderbudgets
            </a>
          </div>
        </div>
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

      <section
        id="kategorien"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <SectionHeader
          eyebrow="Kategorien"
          title="Kernbedienung fuer feste Kategorien"
          copy="Die wichtigste Aktion bleibt klar sichtbar: neue Kategorie anlegen. Bestehende Kategorien koennen direkt darunter gepflegt oder deaktiviert werden."
        />

        <form
          action={createCategoryAction}
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <div className="xl:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-name">
              Name
            </label>
            <input
              id="new-name"
              name="name"
              required
              maxLength={60}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Neue Kategorie"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-color">
              Farbe
            </label>
            <input
              id="new-color"
              name="colorHex"
              maxLength={7}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="#1D4ED8"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-icon">
              Icon
            </label>
            <input
              id="new-icon"
              name="iconName"
              maxLength={24}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="cart"
            />
          </div>

          <div className="flex flex-col justify-end gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isDefault" className="h-4 w-4 rounded border-slate-300" />
              Standard
            </label>
            <button
              type="submit"
              className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200"
            >
              Kategorie erstellen
            </button>
          </div>
        </form>

        <ul className="space-y-3">
          {categories.map((category) => (
            <li key={category.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <form action={updateCategoryAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                <input type="hidden" name="categoryId" value={category.id} />

                <div className="xl:col-span-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor={`name-${category.id}`}>
                    Name
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <CategoryVisualMark
                      name={category.name}
                      iconName={category.iconName}
                      colorHex={category.colorHex}
                      className="h-10 w-10 text-sm"
                    />
                    <input
                      id={`name-${category.id}`}
                      name="name"
                      required
                      maxLength={60}
                      defaultValue={category.name}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor={`color-${category.id}`}>
                    Farbe
                  </label>
                  <input
                    id={`color-${category.id}`}
                    name="colorHex"
                    maxLength={7}
                    defaultValue={category.colorHex ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="#1D4ED8"
                  />
                </div>

                <div className="xl:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor={`icon-${category.id}`}>
                    Icon
                  </label>
                  <input
                    id={`icon-${category.id}`}
                    name="iconName"
                    maxLength={24}
                    defaultValue={category.iconName ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="cart"
                  />
                </div>

                <div className="xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeTone(category.isActive)}`}>
                      {category.isActive ? "aktiv" : "deaktiviert"}
                    </span>
                    <span
                      aria-label="Farbvorschau"
                      className="h-5 w-5 rounded border border-slate-300"
                      style={{ backgroundColor: categoryColorPreview(category.colorHex) }}
                    />
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Historie</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Budgets: <span className="font-semibold">{category.monthlyBudgetCount}</span>
                  </p>
                  <p className="text-sm text-slate-700">
                    Buchungen: <span className="font-semibold">{category.transactionCount}</span>
                  </p>
                </div>

                <div className="xl:col-span-1 flex items-center">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isDefault"
                      defaultChecked={category.isDefault}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Standard
                  </label>
                </div>

                <div className="md:col-span-2 xl:col-span-12 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="submit"
                    name="intent"
                    value="save"
                    className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200"
                  >
                    Speichern
                  </button>

                  {category.isActive ? (
                    <button
                      type="submit"
                      name="intent"
                      value="deactivate"
                      className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Deaktivieren
                    </button>
                  ) : (
                    <button
                      type="submit"
                      name="intent"
                      value="reactivate"
                      className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200"
                    >
                      Reaktivieren
                    </button>
                  )}
                </div>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="standardbudgets"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <SectionHeader
          eyebrow="Standardbudgets"
          title="Globale Orientierungswerte pro Kategorie"
          copy="Hier bleibt nur die Kernpflege des globalen Standardwerts pro Kategorie sichtbar. Monats-Overrides werden weiterhin in der Monatsansicht gepflegt."
        />

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Kategorie</th>
                <th className="px-3 py-2 font-semibold">Standardwert</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetRows.map((row) => (
                <tr key={row.categoryId}>
                  <td className="px-3 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <CategoryVisualMark
                        name={categoryVisuals.get(row.categoryId)?.name ?? row.categoryName}
                        iconName={categoryVisuals.get(row.categoryId)?.iconName}
                        colorHex={categoryVisuals.get(row.categoryId)?.colorHex}
                        className="h-8 w-8 text-xs"
                      />
                      <span>{row.categoryName}</span>
                      {!row.isCategoryActive ? (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          inaktiv
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <form action={setCategoryDefaultBudgetAction} className="flex min-w-[14rem] items-center gap-2">
                      <input type="hidden" name="categoryId" value={row.categoryId} />
                      <input
                        name="budgetAmount"
                        inputMode="decimal"
                        defaultValue={toInputAmount(row.defaultBudgetAmountCents)}
                        placeholder="z. B. 250.00"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-200"
                      >
                        Speichern
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600">
                    {row.defaultBudgetAmountCents === null
                      ? "Kein Standardwert gesetzt"
                      : `${row.monthlyOverrideCount} Monats-Override(s) vorhanden`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="sonderbudgets"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <SectionHeader
          eyebrow="Sonderbudgets"
          title="Monatliche Sonderausgaben gebuendelt pflegen"
          copy="Sonderbudgets bleiben fachlich eigenstaendig, werden aber in derselben Verwaltungsoberflaeche gefuehrt wie Kategorien und Standardbudgets."
        />

        <form
          action={createSpecialBudgetAction}
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <div className="xl:col-span-2">
            <label
              className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              htmlFor="new-special-budget-name"
            >
              Name
            </label>
            <input
              id="new-special-budget-name"
              name="name"
              required
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Raspberry Pi"
            />
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              htmlFor="new-month"
            >
              Aktiver Monat
            </label>
            <select
              id="new-month"
              name="monthKey"
              required
              defaultValue={selectedMonthKey}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {selectableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              htmlFor="new-amount"
            >
              Geplant (EUR)
            </label>
            <input
              id="new-amount"
              name="plannedAmount"
              required
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="120,00"
            />
          </div>

          <div className="xl:col-span-4">
            <label
              className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
              htmlFor="new-note"
            >
              Notiz
            </label>
            <input
              id="new-note"
              name="note"
              maxLength={240}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Optionaler Kontext zur geplanten Ausgabe"
            />
          </div>

          <div className="flex items-end xl:col-span-1">
            <button
              type="submit"
              className="w-full rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-200"
            >
              Sonderbudget erstellen
            </button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Monat</th>
                <th className="px-3 py-2 font-semibold">Geplant</th>
                <th className="px-3 py-2 font-semibold">Ist</th>
                <th className="px-3 py-2 font-semibold">Rest</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {specialBudgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-600">
                    Noch keine Sonderbudgets vorhanden.
                  </td>
                </tr>
              ) : (
                specialBudgets.map((budget) => {
                  const remainingCents = budget.plannedAmountCents - budget.actualExpenseCents;
                  const label = specialBudgetStatusLabel(budget.isActive, remainingCents);
                  const tone = specialBudgetStatusTone(budget.isActive, remainingCents);

                  return (
                    <tr key={budget.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">{budget.name}</td>
                      <td className="px-3 py-2 text-slate-700">{formatMonthLabel(budget.monthKey)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatEuro(budget.plannedAmountCents)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatEuro(budget.actualExpenseCents)}</td>
                      <td className={remainingCents < 0 ? "px-3 py-2 font-semibold text-red-700" : "px-3 py-2 text-slate-700"}>
                        {formatEuro(remainingCents)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <form action={updateSpecialBudgetStateAction}>
                          <input type="hidden" name="specialBudgetId" value={budget.id} />
                          {budget.isActive ? (
                            <button
                              type="submit"
                              name="intent"
                              value="deactivate"
                              className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              Deaktivieren
                            </button>
                          ) : (
                            <button
                              type="submit"
                              name="intent"
                              value="reactivate"
                              className="rounded-lg border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                            >
                              Reaktivieren
                            </button>
                          )}
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
