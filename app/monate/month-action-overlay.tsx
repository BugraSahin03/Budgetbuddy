"use client";

import type { ReactNode } from "react";
import { useId, useRef } from "react";

import { ImportForm } from "@/app/import/import-form";
import { createMonthlyManualTransactionAction } from "@/app/monate/actions";
import type {
  AccountOption,
  CategoryOption,
  SpecialBudgetOption,
} from "@/src/transactions/repository";

type MonthActionOverlayProps = {
  monthKey: string;
  monthLabel: string;
  accountOptions: AccountOption[];
  categoryOptions: CategoryOption[];
  specialBudgetOptions: SpecialBudgetOption[];
  defaultAccountId: number | null;
};

function toDefaultBookingDate(monthKey: string): string {
  return `${monthKey}-01`;
}

function categoryMarker(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "#";
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="month-action-label" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function TextInput({
  id,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = true,
}: {
  id: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      className="month-action-input"
    />
  );
}

function AccountSelect({
  id,
  accountOptions,
  defaultAccountId,
}: {
  id: string;
  accountOptions: AccountOption[];
  defaultAccountId: number | null;
}) {
  return (
    <select
      id={id}
      name="accountId"
      defaultValue={defaultAccountId ? String(defaultAccountId) : ""}
      className="month-action-input"
      required
    >
      {accountOptions.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}

function CashToggle({ id }: { id: string }) {
  return (
    <label className="month-action-cash-toggle" htmlFor={id}>
      <input id={id} type="checkbox" name="useCashAccount" />
      <span aria-hidden="true" className="month-action-cash-knob" />
      <span>Bargeld</span>
    </label>
  );
}

function AssignmentTiles({
  categoryOptions,
  specialBudgetOptions,
}: {
  categoryOptions: CategoryOption[];
  specialBudgetOptions: SpecialBudgetOption[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="month-action-label">Kategorie</p>
        <div className="month-action-tile-grid">
          {categoryOptions.map((category) => (
            <label key={category.id} className="month-action-choice">
              <input type="radio" name="assignment" value={`category:${category.id}`} />
              <span aria-hidden="true" className="month-action-choice-icon">
                {categoryMarker(category.name)}
              </span>
              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {specialBudgetOptions.length > 0 ? (
        <div>
          <p className="month-action-label text-amber-700">Sonderbudget</p>
          <div className="month-action-tile-grid">
            {specialBudgetOptions.map((budget) => (
              <label key={budget.id} className="month-action-choice month-action-choice-warn">
                <input type="radio" name="assignment" value={`specialBudget:${budget.id}`} />
                <span aria-hidden="true" className="month-action-choice-icon">
                  {categoryMarker(budget.name)}
                </span>
                <span>{budget.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <input type="hidden" name="specialBudgetId" value="" />
      )}
    </div>
  );
}

function ManualTransactionForm({
  mode,
  monthKey,
  accountOptions,
  categoryOptions,
  specialBudgetOptions,
  defaultAccountId,
}: {
  mode: "expense" | "income";
  monthKey: string;
  accountOptions: AccountOption[];
  categoryOptions: CategoryOption[];
  specialBudgetOptions: SpecialBudgetOption[];
  defaultAccountId: number | null;
}) {
  const id = useId();
  const isExpense = mode === "expense";

  return (
    <form action={createMonthlyManualTransactionAction} className="month-action-form">
      <input type="hidden" name="monthKey" value={monthKey} />
      <input type="hidden" name="effectiveMonthKey" value={monthKey} />
      <input type="hidden" name="transactionType" value={mode} />
      {!isExpense ? (
        <>
          <input type="hidden" name="categoryId" value="" />
          <input type="hidden" name="specialBudgetId" value="" />
        </>
      ) : null}

      <div className="month-action-form-grid">
        <section className="month-action-amount-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="month-action-label">Betrag</p>
              <p className="text-xs font-semibold text-[color:var(--month-ink-soft)]">
                {isExpense ? "Was wurde ausgegeben?" : "Was ist eingegangen?"}
              </p>
            </div>
            <CashToggle id={`${id}-cash`} />
          </div>
          <label className="month-action-amount-field" htmlFor={`${id}-amount`}>
            <span aria-hidden="true">€</span>
            <input
              id={`${id}-amount`}
              name="amount"
              placeholder="0,00"
              required
              inputMode="decimal"
            />
          </label>
        </section>

        <section className="month-action-field-card">
          <FieldLabel htmlFor={`${id}-date`}>Datum</FieldLabel>
          <TextInput
            id={`${id}-date`}
            name="bookingDate"
            type="date"
            defaultValue={toDefaultBookingDate(monthKey)}
          />
        </section>

        <section className="month-action-field-card">
          <FieldLabel htmlFor={`${id}-description`}>Beschreibung</FieldLabel>
          <TextInput
            id={`${id}-description`}
            name="description"
            placeholder={isExpense ? "z. B. Rewe Einkauf" : "z. B. Gehalt"}
          />
        </section>

        <section className="month-action-field-card">
          <FieldLabel htmlFor={`${id}-account`}>Konto</FieldLabel>
          <AccountSelect
            id={`${id}-account`}
            accountOptions={accountOptions}
            defaultAccountId={defaultAccountId}
          />
          <p className="mt-2 text-xs font-semibold text-[color:var(--month-ink-soft)]">
            Mit aktivem Bargeld-Schalter wird automatisch das Bargeldkonto verwendet.
          </p>
        </section>
      </div>

      {isExpense ? (
        <AssignmentTiles
          categoryOptions={categoryOptions}
          specialBudgetOptions={specialBudgetOptions}
        />
      ) : null}

      <button type="submit" className="month-action-submit">
        {isExpense ? "Ausgabe speichern" : "Einnahme speichern"}
      </button>
    </form>
  );
}

export function MonthActionOverlay({
  monthKey,
  accountOptions,
  categoryOptions,
  specialBudgetOptions,
  defaultAccountId,
}: MonthActionOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabId = useId();

  return (
    <>
      <button
        type="button"
        className="month-action-primary"
        onClick={() => dialogRef.current?.showModal()}
      >
        Hinzufuegen
      </button>
      <dialog ref={dialogRef} className="month-action-dialog">
        <div className="month-action-surface">
          <header className="month-action-header">
            <div className="flex min-w-0 items-start gap-4">
              <form method="dialog">
                <button type="submit" className="month-dialog-back" aria-label="Overlay schliessen">
                  Zurueck
                </button>
              </form>
              <div>
                <p className="month-eyebrow">Monatsaktion</p>
                <h2 className="mt-2 text-4xl font-black tracking-[-0.065em] text-[color:var(--month-ink)]">
                  Buchung hinzufuegen
                </h2>
              </div>
            </div>
            <div className="max-w-md text-right">
              <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--month-ink-soft)]">
                Grosszuegige Erfassung fuer Ausgabe, Einnahme und Import im geoeffneten Monat.
              </p>
              <form method="dialog" className="mt-3">
                <button type="submit" className="month-dialog-close" aria-label="Overlay schliessen">
                  Schliessen
                </button>
              </form>
            </div>
          </header>

          <div className="month-action-tabs">
            <input id={`${tabId}-expense`} type="radio" name={`${tabId}-tabs`} defaultChecked />
            <label htmlFor={`${tabId}-expense`}>Ausgabe</label>
            <input id={`${tabId}-income`} type="radio" name={`${tabId}-tabs`} />
            <label htmlFor={`${tabId}-income`}>Einnahme</label>
            <input id={`${tabId}-import`} type="radio" name={`${tabId}-tabs`} />
            <label htmlFor={`${tabId}-import`}>Import</label>

            <section className="month-action-tab-panel month-action-tab-expense">
              <ManualTransactionForm
                mode="expense"
                monthKey={monthKey}
                accountOptions={accountOptions}
                categoryOptions={categoryOptions}
                specialBudgetOptions={specialBudgetOptions}
                defaultAccountId={defaultAccountId}
              />
            </section>

            <section className="month-action-tab-panel month-action-tab-income">
              <ManualTransactionForm
                mode="income"
                monthKey={monthKey}
                accountOptions={accountOptions}
                categoryOptions={categoryOptions}
                specialBudgetOptions={specialBudgetOptions}
                defaultAccountId={defaultAccountId}
              />
            </section>

            <section className="month-action-tab-panel month-action-tab-import">
              <div className="month-action-import-shell">
                <div className="rounded-[1.5rem] bg-[#eef8fd] p-5">
                  <p className="month-eyebrow">Sparkassen-Import</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[color:var(--month-ink)]">
                    CSV pruefen und uebernehmen
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--month-ink-soft)]">
                    Die bestehende Import-Vorschau, Duplikaterkennung und Bestaetigung laufen
                    unveraendert im geoeffneten Monat weiter.
                  </p>
                </div>
                <ImportForm
                  defaultEffectiveMonthKey={monthKey}
                  returnMonthKey={monthKey}
                  surface="embedded"
                />
              </div>
            </section>
          </div>
        </div>
      </dialog>
    </>
  );
}
