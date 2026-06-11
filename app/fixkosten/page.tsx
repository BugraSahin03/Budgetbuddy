import { createFixedCostAction, updateFixedCostAction } from "@/app/fixkosten/actions";
import { FixedCostCareEditor } from "@/app/components/fixed-cost-care-editor";
import { FixedCostDialog } from "@/app/components/fixed-cost-dialog";
import { getFixedCostsSummary, listFixedCosts } from "@/src/fixed-costs/repository";

export const dynamic = "force-dynamic";

type FixedCostsPageProps = {
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

export default async function FixedCostsPage({ searchParams }: FixedCostsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);
  const initialIsEditing = toSingleParam(params.edit) === "1";

  const fixedCosts = listFixedCosts();
  const summary = getFixedCostsSummary();

  return (
    <section className="fixed-cost-care-shell">
      <header className="fixed-cost-hero-panel">
        <div>
          <p className="month-eyebrow">Fixkosten</p>
          <h1>Fixkostenpflege</h1>
          <p>
            Pflege wiederkehrende Monatskosten als ruhigen Planungsblock. Importhinweise bleiben im Monatskontext und ueberladen diese Pflegeansicht nicht.
          </p>
        </div>
        <div className="fixed-cost-hero-side">
          <aside className="fixed-cost-hero-summary" aria-label="Monatlicher Fixkostenblock">
            <span>Monatlicher Fixkostenblock</span>
            <strong>{formatEuro(summary.plannedTotalCents)}</strong>
            <small>{summary.activeCount} aktive Fixkosten</small>
          </aside>
          <FixedCostDialog
            triggerLabel="+"
            triggerAriaLabel="Fixkosten anlegen"
            triggerClassName="budget-dialog-plus"
            eyebrow="Neue Fixkosten"
            title="Fixkosten anlegen"
          >
            <form action={createFixedCostAction} className="budget-dialog-form">
              <label>
                Name
                <input name="name" required maxLength={80} placeholder="Zum Beispiel Fitness Studio" />
              </label>
              <label>
                Betrag
                <input name="plannedAmount" required inputMode="decimal" placeholder="34,90" />
              </label>
              <label>
                Abbuchungstag
                <input name="bookingDayOfMonth" inputMode="numeric" placeholder="1-31 oder leer" />
              </label>
              <label>
                Abbuchungsinfo
                <input name="paymentNote" maxLength={60} placeholder="SEPA Lastschrift" />
              </label>
              <label>
                Notiz
                <input name="note" maxLength={240} placeholder="Optional" />
              </label>
              <button type="submit" className="budget-primary-button">
                Fixkosten speichern
              </button>
            </form>
          </FixedCostDialog>
        </div>
      </header>

      {notice ? <p className="fixed-cost-notice fixed-cost-notice-success">{notice}</p> : null}
      {error ? <p className="fixed-cost-notice fixed-cost-notice-error">{error}</p> : null}

      <FixedCostCareEditor
        action={updateFixedCostAction}
        fixedCosts={fixedCosts}
        initialIsEditing={initialIsEditing}
      />
    </section>
  );
}
