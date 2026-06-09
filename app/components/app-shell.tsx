"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { AppNavigation } from "@/app/components/app-navigation";
import {
  NAV_COLLAPSED_STORAGE_KEY,
  getNavigationToggleLabel,
} from "@/app/components/navigation-config";

type AppShellProps = {
  children: ReactNode;
};

const NAV_COLLAPSED_EVENT = "budgetbuddy:navigation-collapsed-change";

function getCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "true";
}

function subscribeToCollapsedState(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(NAV_COLLAPSED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(NAV_COLLAPSED_EVENT, callback);
  };
}

export function AppShell({ children }: AppShellProps) {
  const collapsed = useSyncExternalStore(
    subscribeToCollapsedState,
    getCollapsedSnapshot,
    () => false,
  );

  function toggleNavigation() {
    window.localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(NAV_COLLAPSED_EVENT));
  }

  return (
    <div className={`app-shell ${collapsed ? "app-shell-collapsed" : ""}`}>
      <aside className="app-sidebar" aria-label="App-Shell">
        <div className="app-brand-row">
          <div className="app-brand-mark" aria-hidden="true">
            BB
          </div>
          <div className="app-brand-copy">
            <p>BudgetBuddy</p>
          </div>
          <button
            type="button"
            className="app-nav-toggle"
            aria-label={getNavigationToggleLabel(collapsed)}
            aria-expanded={!collapsed}
            onClick={toggleNavigation}
          >
            <span aria-hidden="true">{collapsed ? ">" : "<"}</span>
          </button>
        </div>

        <AppNavigation collapsed={collapsed} />
      </aside>

      <div className="app-content-frame">
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
