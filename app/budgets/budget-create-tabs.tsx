"use client";

import { type ReactNode, useState } from "react";

type BudgetCreateTabsProps = {
  categoryForm: ReactNode;
  specialBudgetForm: ReactNode;
};

export function BudgetCreateTabs({ categoryForm, specialBudgetForm }: BudgetCreateTabsProps) {
  const [activeTab, setActiveTab] = useState<"category" | "special">("category");

  return (
    <div className="budget-create-tabs">
      <div className="budget-create-tab-list" role="tablist" aria-label="Eintragstyp waehlen">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "category"}
          className="budget-create-tab"
          onClick={() => setActiveTab("category")}
        >
          Kategorien
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "special"}
          className="budget-create-tab"
          onClick={() => setActiveTab("special")}
        >
          Sonderbudgets
        </button>
      </div>

      <section className="budget-create-dialog-group" role="tabpanel">
        {activeTab === "category" ? (
          <>
            <h3>Kategorie erstellen</h3>
            <p>Dauerhafter Budgettopf fuer regelmaessige Ausgaben.</p>
            {categoryForm}
          </>
        ) : (
          <>
            <h3>Sonderbudget erstellen</h3>
            <p>Monatstopf fuer einmalige oder besondere Ausgaben.</p>
            {specialBudgetForm}
          </>
        )}
      </section>
    </div>
  );
}
