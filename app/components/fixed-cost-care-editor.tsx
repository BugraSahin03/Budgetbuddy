type FixedCostCareEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  fixedCosts: FixedCostEditorRow[];
  initialIsEditing?: boolean;
};

type FixedCostEditorRow = {
  id: number;
  name: string;
  plannedAmountCents: number;
  bookingDayOfMonth: number | null;
  paymentNote: string | null;
  note: string | null;
  isActive: boolean;
};

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function toInputAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function statusLabel(isActive: boolean): string {
  return isActive ? "Aktiv" : "Inaktiv";
}

function bookingDayLabel(day: number | null): string {
  return day === null ? "Kein fester Tag" : `${day}. des Monats`;
}

function optionalLabel(value: string | null): string {
  return value && value.trim().length > 0 ? value : "Keine Angabe";
}

export function FixedCostCareEditor({
  action,
  fixedCosts,
  initialIsEditing = false,
}: FixedCostCareEditorProps) {
  const isEditing = initialIsEditing;

  return (
    <section className={`fixed-cost-panel fixed-cost-care-editor ${isEditing ? "is-editing" : ""}`} aria-labelledby="fixed-cost-list-heading">
      <div className="fixed-cost-section-heading fixed-cost-care-heading">
        <div>
          <p className="month-eyebrow">Pflege</p>
          <h2 id="fixed-cost-list-heading">Bestehende Fixkosten</h2>
        </div>
        {fixedCosts.length > 0 && isEditing ? (
          <button
            key="save-fixed-costs"
            type="submit"
            form="fixed-cost-edit-form"
            className="budget-icon-action budget-icon-action-save"
            aria-label="Aenderungen speichern und Editiermodus beenden"
            title="Speichern"
          >
            ✓
          </button>
        ) : null}
        {fixedCosts.length > 0 && !isEditing ? (
          <a
            key="edit-fixed-costs"
            href="/fixkosten?edit=1"
            className="budget-icon-action"
            aria-label="Fixkosten bearbeiten"
            title="Bearbeiten"
          >
            ✎
          </a>
        ) : null}
      </div>

      {fixedCosts.length === 0 ? (
        <p className="fixed-cost-empty-state">Noch keine Fixkosten vorhanden.</p>
      ) : (
        <form id="fixed-cost-edit-form" action={action}>
          <div className="fixed-cost-list">
            {fixedCosts.map((row) => (
              <article key={row.id} className={`fixed-cost-card ${row.isActive ? "" : "is-inactive"}`}>
                <input type="hidden" name="fixedCostIds" value={row.id} />
                <input type="hidden" name={`isActive-${row.id}`} value={row.isActive ? "on" : ""} />
                {!isEditing ? (
                  <div className="fixed-cost-read-card">
                    <div className="fixed-cost-read-title">
                      <h3>{row.name}</h3>
                      <span className={`fixed-cost-state-dot ${row.isActive ? "" : "is-muted"}`}>
                        {statusLabel(row.isActive)}
                      </span>
                    </div>
                    <div className="fixed-cost-read-grid">
                      <span>
                        <small>Betrag</small>
                        <strong>{formatEuro(row.plannedAmountCents)}</strong>
                      </span>
                      <span>
                        <small>Abbuchung</small>
                        <strong>{bookingDayLabel(row.bookingDayOfMonth)}</strong>
                      </span>
                      <span>
                        <small>Info</small>
                        <strong>{optionalLabel(row.paymentNote)}</strong>
                      </span>
                      <span>
                        <small>Notiz</small>
                        <strong>{optionalLabel(row.note)}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="fixed-cost-edit-form">
                    <input type="hidden" name={`fixedCostId-${row.id}`} value={row.id} />
                    <div className="fixed-cost-card-title">
                      <span className={`fixed-cost-state-dot ${row.isActive ? "" : "is-muted"}`}>
                        {statusLabel(row.isActive)}
                      </span>
                      <label>
                        <span>Name</span>
                        <input name={`name-${row.id}`} defaultValue={row.name} maxLength={80} />
                      </label>
                    </div>

                    <label>
                      <span>Betrag</span>
                      <input name={`plannedAmount-${row.id}`} defaultValue={toInputAmount(row.plannedAmountCents)} inputMode="decimal" />
                    </label>

                    <label>
                      <span>Abbuchungstag</span>
                      <input
                        name={`bookingDayOfMonth-${row.id}`}
                        defaultValue={row.bookingDayOfMonth ? String(row.bookingDayOfMonth) : ""}
                        inputMode="numeric"
                        placeholder="1-31"
                      />
                    </label>

                    <label>
                      <span>Abbuchungsinfo</span>
                      <input name={`paymentNote-${row.id}`} defaultValue={row.paymentNote ?? ""} maxLength={60} />
                    </label>

                    <label>
                      <span>Notiz</span>
                      <input name={`note-${row.id}`} defaultValue={row.note ?? ""} maxLength={240} />
                    </label>

                    <div className="fixed-cost-card-actions">
                      <button
                        type="submit"
                        name="stateChangeFixedCostId"
                        value={row.id}
                        className={row.isActive ? "fixed-cost-muted-action" : "fixed-cost-reactivate-action"}
                      >
                        {row.isActive ? "Deaktivieren" : "Reaktivieren"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </form>
      )}
    </section>
  );
}
