import Link from "next/link";

import { reactivateCategoryAction } from "@/app/einstellungen/actions";
import { CategoryVisualMark } from "@/app/components/category-visual";
import { listInactiveCategories } from "@/src/categories/repository";

export const dynamic = "force-dynamic";

type CategoryArchivePageProps = {
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

export default async function CategoryArchivePage({ searchParams }: CategoryArchivePageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const inactiveCategories = listInactiveCategories();

  return (
    <section className="month-page-shell space-y-5">
      <section className="month-hero-panel relative overflow-hidden">
        <span className="month-hero-orb month-hero-orb-left" aria-hidden="true" />
        <span className="month-hero-orb month-hero-orb-right" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/einstellungen" aria-label="Zurueck zu Einstellungen" className="month-chip month-chip-neutral mb-4 w-fit text-lg">
              &larr;
            </Link>
            <p className="month-eyebrow">Archiv</p>
            <h2 className="month-hero-title mt-2">Kategorie-Archiv</h2>
            <p className="month-hero-copy mt-4">
              Deaktivierte Kategorien bleiben fuer historische Buchungen erhalten und koennen hier reaktiviert werden.
            </p>
          </div>
          <div className="month-stat-card month-stat-card-calm min-w-64">
            <p className="month-stat-label">Archivierte Kategorien</p>
            <p className="month-stat-value mt-2">{inactiveCategories.length}</p>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <section className="month-section-panel space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="month-eyebrow">Kategorien</p>
            <h3 className="month-section-title mt-1">Deaktivierte Kategorien</h3>
          </div>
          <span className="month-chip month-chip-neutral w-fit">
            {inactiveCategories.length} Eintraege
          </span>
        </header>

        {inactiveCategories.length === 0 ? (
          <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/75 px-4 py-6 text-sm text-[color:var(--month-ink-soft)]">
            Keine deaktivierten Kategorien im Archiv.
          </p>
        ) : (
          <ul className="space-y-3">
            {inactiveCategories.map((category) => (
              <li key={category.id} className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex items-center gap-3">
                    <CategoryVisualMark
                      name={category.name}
                      iconName={category.iconName}
                      colorHex={category.colorHex}
                      variant="neutral"
                      className="budget-pot-icon"
                    />
                    <div>
                      <h4 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
                        {category.name}
                      </h4>
                      <p className="text-sm text-[color:var(--month-ink-soft)]">
                        {category.transactionCount} Buchungen · {category.monthlyBudgetCount} Monatswerte
                      </p>
                    </div>
                  </div>

                  <form action={reactivateCategoryAction}>
                    <input type="hidden" name="categoryId" value={category.id} />
                    <button type="submit" className="rounded-[1rem] border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100">
                      Reaktivieren
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
