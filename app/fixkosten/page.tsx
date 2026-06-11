import {
  createFixedCostAction,
  updateFixedCostAction,
} from "@/app/fixkosten/actions";
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

function rowStatusTone(isActive: boolean): string {
  if (!isActive) {
    return "fixed-cost-status-muted";
  }

  return "fixed-cost-status-active";
}

function rowStatusLabel(isActive: boolean): string {
  return isActive ? "Aktiv" : "Inaktiv";
}

export default async function FixedCostsPage({ searchParams }: FixedCostsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

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
        <aside className="fixed-cost-hero-summary" aria-label="Monatlicher Fixkostenblock">
          <span>Monatlicher Fixkostenblock</span>
          <strong>{formatEuro(summary.plannedTotalCents)}</strong>
          <small>{summary.activeCount} aktive Fixkosten</small>
        </aside>
      </header>

      {notice ? <p className="fixed-cost-notice fixed-cost-notice-success">{notice}</p> : null}
      {error ? <p className="fixed-cost-notice fixed-cost-notice-error">{error}</p> : null}

      <section className="fixed-cost-panel" aria-labelledby="new-fixed-cost-heading">
        <div className="fixed-cost-section-heading">
          <p className="month-eyebrow">Neu anlegen</p>
          <h2 id="new-fixed-cost-heading">Fixkosten hinzufuegen</h2>
        </div>

        <form action={createFixedCostAction} className="fixed-cost-create-form">
          <label>
            <span>Name</span>
            <input id="new-name" name="name" required maxLength={80} placeholder="Fitness Studio" />
          </label>

          <label>
            <span>Betrag</span>
            <input id="new-amount" name="plannedAmount" required inputMode="decimal" placeholder="34,90" />
          </label>

          <label>
            <span>Abbuchungstag</span>
            <input id="new-booking-day" name="bookingDayOfMonth" inputMode="numeric" placeholder="1-31 oder leer" />
          </label>

          <label>
            <span>Abbuchungsinfo</span>
            <input id="new-payment-note" name="paymentNote" maxLength={60} placeholder="SEPA Lastschrift" />
          </label>

          <label className="fixed-cost-form-wide">
            <span>Notiz</span>
            <input id="new-note" name="note" maxLength={240} placeholder="Optional" />
          </label>

          <button type="submit" className="fixed-cost-primary-action">
            Fixkosten speichern
          </button>
        </form>
      </section>

      <section className="fixed-cost-panel" aria-labelledby="fixed-cost-list-heading">
        <div className="fixed-cost-section-heading">
          <p className="month-eyebrow">Pflege</p>
          <h2 id="fixed-cost-list-heading">Bestehende Fixkosten</h2>
        </div>

        {fixedCosts.length === 0 ? (
          <p className="fixed-cost-empty-state">Noch keine Fixkosten vorhanden.</p>
        ) : (
          <div className="fixed-cost-list">
            {fixedCosts.map((row) => (
              <article key={row.id} className={`fixed-cost-card ${row.isActive ? "" : "is-inactive"}`}>
                <form action={updateFixedCostAction} className="fixed-cost-edit-form">
                  <input type="hidden" name="fixedCostId" value={row.id} />

                  <div className="fixed-cost-card-title">
                    <span className={`fixed-cost-status ${rowStatusTone(row.isActive)}`}>
                      {rowStatusLabel(row.isActive)}
                    </span>
                    <label>
                      <span>Name</span>
                      <input name="name" defaultValue={row.name} maxLength={80} />
                    </label>
                  </div>

                  <label>
                    <span>Betrag</span>
                    <input
                      name="plannedAmount"
                      defaultValue={(row.plannedAmountCents / 100).toFixed(2).replace(".", ",")}
                      inputMode="decimal"
                    />
                  </label>

                  <label>
                    <span>Abbuchungstag</span>
                    <input
                      name="bookingDayOfMonth"
                      defaultValue={row.bookingDayOfMonth ? String(row.bookingDayOfMonth) : ""}
                      inputMode="numeric"
                      placeholder="1-31"
                    />
                  </label>

                  <label>
                    <span>Abbuchungsinfo</span>
                    <input name="paymentNote" defaultValue={row.paymentNote ?? ""} maxLength={60} />
                  </label>

                  <label>
                    <span>Notiz</span>
                    <input name="note" defaultValue={row.note ?? ""} maxLength={240} />
                  </label>

                  <div className="fixed-cost-card-actions">
                    <button type="submit" className="fixed-cost-secondary-action">
                      Speichern
                    </button>
                    <button
                      type="submit"
                      name="intent"
                      value={row.isActive ? "deactivate" : "reactivate"}
                      className={row.isActive ? "fixed-cost-muted-action" : "fixed-cost-reactivate-action"}
                    >
                      {row.isActive ? "Deaktivieren" : "Reaktivieren"}
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
