"use client";

import { useMemo, useState } from "react";

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
  sortOrder: number;
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

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function matchesSearch(row: FixedCostEditorRow, searchTerm: string): boolean {
  const normalizedTerm = normalizeSearch(searchTerm);

  if (normalizedTerm.length === 0) {
    return true;
  }

  return [row.name, row.paymentNote ?? "", row.note ?? "", bookingDayLabel(row.bookingDayOfMonth), formatEuro(row.plannedAmountCents)]
    .join(" ")
    .toLocaleLowerCase("de-DE")
    .includes(normalizedTerm);
}

export function FixedCostCareEditor({
  action,
  fixedCosts,
  initialIsEditing = false,
}: FixedCostCareEditorProps) {
  const isEditing = initialIsEditing;
  const [orderedIds, setOrderedIds] = useState(() => fixedCosts.map((row) => row.id));
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const fixedCostsById = useMemo(
    () => new Map(fixedCosts.map((row) => [row.id, row])),
    [fixedCosts],
  );
  const orderedFixedCosts = orderedIds
    .map((id) => fixedCostsById.get(id))
    .filter((row): row is FixedCostEditorRow => Boolean(row));
  const filteredFixedCosts = orderedFixedCosts.filter((row) => matchesSearch(row, searchTerm));
  const visibleFixedCosts = isEditing ? orderedFixedCosts : filteredFixedCosts;
  const hasFilter = searchTerm.trim().length > 0;

  function moveFixedCost(fromId: number, toId: number): void {
    if (fromId === toId) {
      return;
    }

    setOrderedIds((currentIds) => {
      const fromIndex = currentIds.indexOf(fromId);
      const toIndex = currentIds.indexOf(toId);

      if (fromIndex === -1 || toIndex === -1) {
        return currentIds;
      }

      const nextIds = [...currentIds];
      const [movedId] = nextIds.splice(fromIndex, 1);
      nextIds.splice(toIndex, 0, movedId);
      return nextIds;
    });
  }

  function moveFixedCostByOffset(fixedCostId: number, offset: number): void {
    setOrderedIds((currentIds) => {
      const fromIndex = currentIds.indexOf(fixedCostId);
      const toIndex = fromIndex + offset;

      if (fromIndex === -1 || toIndex < 0 || toIndex >= currentIds.length) {
        return currentIds;
      }

      const nextIds = [...currentIds];
      const [movedId] = nextIds.splice(fromIndex, 1);
      nextIds.splice(toIndex, 0, movedId);
      return nextIds;
    });
  }

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
            aria-label="Änderungen speichern und Editiermodus beenden"
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
        <>
          {!isEditing ? (
            <div className="fixed-cost-filter-panel" aria-label="Fixkosten filtern">
              <label className="fixed-cost-search-field">
                <span>Suche</span>
                <div className="fixed-cost-search-control">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Fixkosten suchen"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Name, Info oder Notiz"
                  />
                  <strong>
                    {filteredFixedCosts.length}/{fixedCosts.length}
                  </strong>
                </div>
              </label>

              <div className="fixed-cost-filter-summary">
                {hasFilter ? (
                  <button
                    type="button"
                    className="fixed-cost-filter-reset"
                    onClick={() => {
                      setSearchTerm("");
                    }}
                  >
                    Zurücksetzen
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <form id="fixed-cost-edit-form" action={action}>
            <div className="fixed-cost-list">
              {visibleFixedCosts.map((row, index) => (
                <article
                  key={row.id}
                  className={`fixed-cost-card ${row.isActive ? "" : "is-inactive"} ${isEditing ? "is-sortable" : ""} ${draggedId === row.id ? "is-dragging" : ""}`}
                  draggable={isEditing}
                  onDragStart={() => {
                    if (isEditing) {
                      setDraggedId(row.id);
                    }
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(event) => {
                    if (isEditing && draggedId !== null) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();

                    if (isEditing && draggedId !== null) {
                      moveFixedCost(draggedId, row.id);
                      setDraggedId(null);
                    }
                  }}
                >
                  <input type="hidden" name="fixedCostIds" value={row.id} />
                  <input type="hidden" name="sortOrderIds" value={row.id} />
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
                      <div className="fixed-cost-sort-controls" aria-label={`Reihenfolge für ${row.name}`}>
                        <span className="fixed-cost-drag-handle" aria-hidden="true">
                          ↕
                        </span>
                        <button
                          type="button"
                          className="fixed-cost-sort-button"
                          onClick={() => moveFixedCostByOffset(row.id, -1)}
                          disabled={index === 0}
                          aria-label={`${row.name} nach oben verschieben`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="fixed-cost-sort-button"
                          onClick={() => moveFixedCostByOffset(row.id, 1)}
                          disabled={index === visibleFixedCosts.length - 1}
                          aria-label={`${row.name} nach unten verschieben`}
                        >
                          ↓
                        </button>
                      </div>
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
                          className="fixed-cost-muted-action"
                        >
                          Deaktivieren
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </form>

          {!isEditing && visibleFixedCosts.length === 0 ? (
            <p className="fixed-cost-empty-state fixed-cost-filter-empty">
              Keine Fixkosten passen zu Suche oder Filter.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
