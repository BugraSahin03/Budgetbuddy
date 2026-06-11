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
          Sonderkategorien
        </button>
      </div>

      <section className="budget-create-dialog-group" role="tabpanel">
        {activeTab === "category" ? (
          <>
            <h3>Kategorie erstellen</h3>
            {categoryForm}
          </>
        ) : (
          <>
            <h3>Sonderkategorie erstellen</h3>
            {specialBudgetForm}
          </>
        )}
      </section>
    </div>
  );
}
