"use client";

import type { ReactNode } from "react";
import { useId, useRef } from "react";

import { ImportForm } from "@/app/import/import-form";
import {
  CategoryVisualMark,
  categorySoftStyle,
} from "@/app/components/category-visual";
import { createMonthlyManualTransactionAction } from "@/app/monate/actions";
import type {
  AccountOption,
  CategoryOption,
  SpecialBudgetOption,
} from "@/src/transactions/repository";

type CategoryVisualOption = CategoryOption & {
  iconName?: string | null;
  colorHex?: string | null;
};

type MonthActionOverlayProps = {
  monthKey: string;
  monthLabel: string;
  accountOptions: AccountOption[];
  categoryOptions: CategoryVisualOption[];
  specialBudgetOptions: SpecialBudgetOption[];
  defaultAccountId: number | null;
};

function toDefaultBookingDate(): string {
  return new Date().toLocaleDateString("en-CA");
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

function HiddenAccountInput({
  accountOptions,
  defaultAccountId,
}: {
  accountOptions: AccountOption[];
  defaultAccountId: number | null;
}) {
  const fallbackAccountId = defaultAccountId ?? accountOptions[0]?.id ?? "";

  return (
    <input
      type="hidden"
      name="accountId"
      value={fallbackAccountId ? String(fallbackAccountId) : ""}
    />
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
  categoryOptions: CategoryVisualOption[];
  specialBudgetOptions: SpecialBudgetOption[];
}) {
  return (
    <section className="month-action-category-panel">
      <div className="month-action-panel-title-row">
        <p className="month-action-label">Kategorie</p>
        <span>Alle verwalten</span>
      </div>
      <div className="month-action-tile-grid">
        {categoryOptions.map((category) => (
          <label
            key={category.id}
            className="month-action-choice"
            style={categorySoftStyle(category.colorHex)}
          >
            <input type="radio" name="assignment" value={`category:${category.id}`} />
            <CategoryVisualMark
              name={category.name}
              iconName={category.iconName}
              colorHex={category.colorHex}
              className="month-action-choice-icon"
            />
            <span>{category.name}</span>
          </label>
        ))}
      </div>

      {specialBudgetOptions.length > 0 ? (
        <div className="mt-6">
          <div className="month-action-panel-title-row">
            <p className="month-action-label text-amber-700">Sonderkategorie</p>
            <span>Monatlich</span>
          </div>
          <div className="month-action-tile-grid">
            {specialBudgetOptions.map((budget) => (
              <label key={budget.id} className="month-action-choice month-action-choice-warn">
                <input type="radio" name="assignment" value={`specialBudget:${budget.id}`} />
                <span aria-hidden="true" className="month-action-choice-icon">
                  {budget.name.trim().slice(0, 1).toUpperCase() || "#"}
                </span>
                <span>{budget.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <input type="hidden" name="specialBudgetId" value="" />
      )}
    </section>
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
  categoryOptions: CategoryVisualOption[];
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
      <HiddenAccountInput accountOptions={accountOptions} defaultAccountId={defaultAccountId} />
      {!isExpense ? (
        <>
          <input type="hidden" name="categoryId" value="" />
          <input type="hidden" name="specialBudgetId" value="" />
        </>
      ) : null}

      <section className="month-action-amount-stage">
        <div className="flex justify-center">
          <CashToggle id={`${id}-cash`} />
        </div>
        <p className="month-action-label text-center">Betrag</p>
        <div className="month-action-amount-row">
          <label className="month-action-amount-field" htmlFor={`${id}-amount`}>
            <span aria-hidden="true">EUR</span>
            <input
              id={`${id}-amount`}
              name="amount"
              placeholder="0,00"
              required
              inputMode="decimal"
            />
          </label>
        </div>
        <p
          className={
            isExpense
              ? "month-action-budget-pill"
              : "month-action-budget-pill month-action-budget-pill-positive"
          }
        >
          {isExpense ? "Wird vom Monatsbudget abgezogen" : "Wird als Einnahme erfasst"}
        </p>
      </section>

      <div className="month-action-field-grid">
        <section className="month-action-field-card">
          <FieldLabel htmlFor={`${id}-date`}>Datum</FieldLabel>
          <TextInput
            id={`${id}-date`}
            name="bookingDate"
            type="date"
            defaultValue={toDefaultBookingDate()}
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
      </div>

      {isExpense ? (
        <AssignmentTiles
          categoryOptions={categoryOptions}
          specialBudgetOptions={specialBudgetOptions}
        />
      ) : null}

      <div className="month-action-save-dock">
        <button type="submit" className="month-action-submit">
          {isExpense ? "Ausgabe speichern" : "Einnahme speichern"}
          <span aria-hidden="true">OK</span>
        </button>
      </div>
    </form>
  );
}

function ImportPanel({ monthKey }: { monthKey: string }) {
  return (
    <div className="month-action-import-shell">
      <div className="month-action-import-intro">
        <p className="month-action-label">Import</p>
        <h3>CSV pruefen und uebernehmen</h3>
        <p>
          Sparkassen-Import bleibt im selben Dialog verfuegbar. Der geoeffnete Monat wird hidden
          uebernommen, ohne zusaetzliche Monatsauswahl.
        </p>
      </div>
      <ImportForm
        defaultEffectiveMonthKey={monthKey}
        returnMonthKey={monthKey}
        surface="embedded"
      />
    </div>
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
        aria-label="Buchung hinzufuegen"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span aria-hidden="true">+</span>
        <span className="month-action-primary-label">Hinzufuegen</span>
      </button>
      <dialog ref={dialogRef} className="month-action-dialog">
        <div className="month-action-surface">
          <header className="month-action-topbar">
            <form method="dialog">
              <button type="submit" className="month-action-back" aria-label="Overlay schliessen">
                Zurueck
              </button>
            </form>
            <h2>Buchung hinzufuegen</h2>
          </header>

          <div className="month-action-page">
            <div className="month-action-tabs">
              <input id={`${tabId}-expense`} type="radio" name={`${tabId}-tabs`} defaultChecked />
              <label htmlFor={`${tabId}-expense`}>Ausgabe</label>
              <input id={`${tabId}-income`} type="radio" name={`${tabId}-tabs`} />
              <label htmlFor={`${tabId}-income`}>Einnahme</label>
              <input id={`${tabId}-import`} type="radio" name={`${tabId}-tabs`} />
              <label htmlFor={`${tabId}-import`}>Import CSV</label>

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
                <ImportPanel monthKey={monthKey} />
              </section>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
