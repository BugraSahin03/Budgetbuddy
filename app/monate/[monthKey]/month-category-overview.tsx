import { CategoryVisualMark } from "@/app/components/category-visual";
import { formatEuro } from "@/src/dashboard/ui";
import {
  categoryUsageProgressStyle,
  getCategoryPlanScale,
  getCategoryUsageState,
  getHighestPlannedAmountCents,
} from "@/src/months/category-usage";

type CategoryOverviewRow = {
  categoryId: number;
  categoryName: string;
  categoryIconName: string | null;
  isSavingsCategory: boolean;
  budgetAmountCents: number | null;
  spentAmountCents: number;
};

type SpecialBudgetOverviewRow = {
  id: number;
  name: string;
  iconName: string | null;
  plannedAmountCents: number;
  actualExpenseCents: number;
};

type MonthCategoryOverviewProps = {
  categoryRows: CategoryOverviewRow[];
  planRestAfterBudgetPotsCents: number;
  specialBudgetRows: SpecialBudgetOverviewRow[];
};

export function MonthCategoryOverview({
  categoryRows,
  planRestAfterBudgetPotsCents,
  specialBudgetRows,
}: MonthCategoryOverviewProps) {
  const highestPlannedAmountCents = getHighestPlannedAmountCents([
    ...categoryRows.map((row) => row.budgetAmountCents),
    ...specialBudgetRows.map((row) => row.plannedAmountCents),
  ]);

  if (categoryRows.length === 0 && specialBudgetRows.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-[color:var(--month-line-strong)] bg-white/72 p-5 text-center text-sm font-bold text-[color:var(--month-ink-soft)]">
        Noch keine Kategorien und Sonderkategorien für diesen Monat vorhanden.
      </div>
    );
  }

  return (
    <>
      {categoryRows.map((row) => {
        const usageState = getCategoryUsageState(row);
        const hasPlannedBudget =
          row.budgetAmountCents !== null && row.budgetAmountCents > 0;
        const isSavingsCategory = row.isSavingsCategory;
        const planScale = getCategoryPlanScale({
          budgetAmountCents: row.budgetAmountCents,
          highestPlannedAmountCents,
        });

        return (
          <div
            key={row.categoryId}
            className="grid gap-3"
            data-live-category-id={row.categoryId}
            data-live-budget-cents={row.budgetAmountCents ?? ""}
            data-live-spent-cents={row.spentAmountCents}
          >
            <div className="flex items-center gap-4">
              <CategoryVisualMark
                name={row.categoryName}
                iconName={row.categoryIconName}
                className="h-12 w-12 text-sm"
                variant="neutral"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="month-category-title truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                    {row.categoryName}
                  </p>
                  <p
                    className="shrink-0 whitespace-nowrap text-xs font-extrabold text-[color:var(--month-ink)] sm:text-sm"
                    data-live-amount
                  >
                    {formatEuro(row.spentAmountCents)}
                  </p>
                </div>
                {planScale.hasPlannedBudget ? (
                  <div
                    className="month-category-scale-guide mt-2"
                    data-plan-scale
                    data-plan-scale-percent={planScale.scalePercent}
                  >
                    <div
                      className="month-category-plan-scale"
                      style={{ width: `${planScale.scalePercent}%` }}
                    >
                      <div
                        className="h-full rounded-full"
                        data-live-progress
                        style={{
                          width: `${usageState.progressPercent}%`,
                          ...categoryUsageProgressStyle(usageState),
                        }}
                      />
                    </div>
                    <span
                      aria-hidden="true"
                      className="month-category-plan-end-marker"
                      style={{ left: `${planScale.scalePercent}%` }}
                    />
                  </div>
                ) : null}
                {!isSavingsCategory ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                    <span
                      className="month-category-usage-badge"
                      data-live-usage-label
                    >
                      {!hasPlannedBudget
                        ? "Budget fehlt"
                        : `${usageState.percent}% genutzt`}
                    </span>
                    <span data-live-plan-label>
                      {!hasPlannedBudget
                        ? "Kein Planwert"
                        : `Plan ${formatEuro(row.budgetAmountCents ?? 0)}`}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <div className="inline-flex w-fit rounded-[1.25rem] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_12px_28px_rgba(7,27,70,0.06)]">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[color:var(--month-ink-muted)]">
              Rest nach Planung
            </p>
            <p className="text-sm font-black text-[color:var(--month-ink)]">
              {formatEuro(planRestAfterBudgetPotsCents)}
            </p>
          </div>
        </div>
      </div>

      {specialBudgetRows.length > 0 ? (
        <section className="pt-2">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-amber-700">
            Sonderkategorien
          </p>
          <div className="mt-4 space-y-5">
            {specialBudgetRows.map((row) => {
              const usageState = getCategoryUsageState({
                budgetAmountCents: row.plannedAmountCents,
                spentAmountCents: row.actualExpenseCents,
              });
              const hasPlannedBudget = row.plannedAmountCents > 0;
              const planScale = getCategoryPlanScale({
                budgetAmountCents: row.plannedAmountCents,
                highestPlannedAmountCents,
              });

              return (
                <div
                  key={row.id}
                  className="grid gap-3"
                  data-live-special-budget-id={row.id}
                  data-live-budget-cents={row.plannedAmountCents}
                  data-live-spent-cents={row.actualExpenseCents}
                >
                  <div className="flex items-center gap-4">
                    <CategoryVisualMark
                      name={row.name}
                      iconName={row.iconName}
                      className="h-12 w-12 text-sm"
                      variant="neutral"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="month-category-title truncate text-sm font-extrabold text-[color:var(--month-ink)]">
                          {row.name}
                        </p>
                        <p
                          className="shrink-0 whitespace-nowrap text-xs font-extrabold text-[color:var(--month-ink)] sm:text-sm"
                          data-live-amount
                        >
                          {formatEuro(row.actualExpenseCents)}
                        </p>
                      </div>
                      {planScale.hasPlannedBudget ? (
                        <div
                          className="month-category-scale-guide mt-2"
                          data-plan-scale
                          data-plan-scale-percent={planScale.scalePercent}
                        >
                          <div
                            className="month-category-plan-scale"
                            style={{ width: `${planScale.scalePercent}%` }}
                          >
                            <div
                              className="h-full rounded-full"
                              data-live-progress
                              style={{
                                width: `${usageState.progressPercent}%`,
                                ...categoryUsageProgressStyle(usageState),
                              }}
                            />
                          </div>
                          <span
                            aria-hidden="true"
                            className="month-category-plan-end-marker"
                            style={{ left: `${planScale.scalePercent}%` }}
                          />
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
                        <span
                          className="month-category-usage-badge"
                          data-live-usage-label
                        >
                          {!hasPlannedBudget
                            ? "Budget fehlt"
                            : `${usageState.percent}% genutzt`}
                        </span>
                        <span data-live-plan-label>
                          {!hasPlannedBudget
                            ? "Kein Planwert"
                            : `Plan ${formatEuro(row.plannedAmountCents)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
