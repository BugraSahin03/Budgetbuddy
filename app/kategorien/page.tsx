import { createCategoryAction, updateCategoryAction } from "@/app/kategorien/actions";
import { listCategories } from "@/src/categories/repository";

export const dynamic = "force-dynamic";

type CategoriesPageProps = {
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

function statusBadgeTone(isActive: boolean): string {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function categoryColorPreview(colorHex: string | null): string {
  return colorHex ?? "#CBD5E1";
}

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const categories = listCategories();

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Kategorien
        </p>
        <h2 className="text-lg font-semibold text-slate-900">Feste Kategorien verwalten</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aktive Kategorien koennen in Monatsbudgets verwendet werden. Deaktivierte Kategorien
          bleiben fuer historische Buchungen erhalten.
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

      <form
        action={createCategoryAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5"
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
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
            placeholder="Neue Kategorie"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-color">
            Farbe (optional)
          </label>
          <input
            id="new-color"
            name="colorHex"
            maxLength={7}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
            placeholder="#1D4ED8"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-icon">
            Icon (optional)
          </label>
          <input
            id="new-icon"
            name="iconName"
            maxLength={24}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
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
          <li key={category.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action={updateCategoryAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
              <input type="hidden" name="categoryId" value={category.id} />

              <div className="xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor={`name-${category.id}`}>
                  Name
                </label>
                <input
                  id={`name-${category.id}`}
                  name="name"
                  required
                  maxLength={60}
                  defaultValue={category.name}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
                />
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
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
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
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Nutzung</p>
                <p className="mt-1 text-sm text-slate-700">
                  Budgets: <span className="font-semibold">{category.monthlyBudgetCount}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Historie: <span className="font-semibold">{category.transactionCount}</span>
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
  );
}
