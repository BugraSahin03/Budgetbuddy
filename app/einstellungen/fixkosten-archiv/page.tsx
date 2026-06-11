import Link from "next/link";

import { reactivateFixedCostAction } from "@/app/einstellungen/actions";
import { listFixedCosts } from "@/src/fixed-costs/repository";

export const dynamic = "force-dynamic";

type FixedCostArchivePageProps = {
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

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function bookingDayLabel(day: number | null): string {
  return day === null ? "Kein fester Tag" : `${day}. des Monats`;
}

function optionalLabel(value: string | null): string {
  return value && value.trim().length > 0 ? value : "Keine Angabe";
}

export default async function FixedCostArchivePage({ searchParams }: FixedCostArchivePageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const inactiveFixedCosts = listFixedCosts().filter((fixedCost) => !fixedCost.isActive);

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
            <h2 className="month-hero-title mt-2">Fixkostenarchiv</h2>
            <p className="month-hero-copy mt-4">
              Deaktivierte Fixkosten bleiben nachvollziehbar und koennen hier bei Bedarf wieder aktiviert werden.
            </p>
          </div>
          <div className="month-stat-card month-stat-card-calm min-w-64">
            <p className="month-stat-label">Archivierte Fixkosten</p>
            <p className="month-stat-value mt-2">{inactiveFixedCosts.length}</p>
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
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="month-eyebrow">Fixkosten</p>
            <h3 className="month-section-title mt-1">Archivierte Fixkosten</h3>
          </div>
          <span className="month-chip month-chip-neutral w-fit">
            {inactiveFixedCosts.length} Eintraege
          </span>
        </header>

        {inactiveFixedCosts.length === 0 ? (
          <p className="rounded-[1.2rem] border border-[color:var(--month-line)] bg-white/75 px-4 py-6 text-sm text-[color:var(--month-ink-soft)]">
            Keine deaktivierten Fixkosten im Archiv.
          </p>
        ) : (
          <ul className="space-y-3">
            {inactiveFixedCosts.map((fixedCost) => (
              <li key={fixedCost.id} className="rounded-[1.4rem] border border-[color:var(--month-line)] bg-white/82 p-4 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="grid gap-3 lg:grid-cols-[minmax(10rem,0.78fr)_minmax(0,1fr)] lg:items-center">
                    <h4 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--month-ink)]">
                      {fixedCost.name}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <span className="month-chip month-chip-accent">Betrag {formatEuro(fixedCost.plannedAmountCents)}</span>
                      <span className="month-chip month-chip-neutral">Abbuchung {bookingDayLabel(fixedCost.bookingDayOfMonth)}</span>
                      <span className="month-chip month-chip-neutral">Info {optionalLabel(fixedCost.paymentNote)}</span>
                      <span className="month-chip month-chip-neutral">Notiz {optionalLabel(fixedCost.note)}</span>
                    </div>
                  </div>

                  <form action={reactivateFixedCostAction}>
                    <input type="hidden" name="fixedCostId" value={fixedCost.id} />
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
