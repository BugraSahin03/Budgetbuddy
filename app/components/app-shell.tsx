"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { AppNavigation } from "@/app/components/app-navigation";
import {
  NAV_COLLAPSED_STORAGE_KEY,
  NAV_ITEMS,
  getNavigationToggleLabel,
  isActivePath,
} from "@/app/components/navigation-config";

type AppShellProps = {
  children: ReactNode;
};

const NAV_COLLAPSED_EVENT = "budgetbuddy:navigation-collapsed-change";
const MOBILE_NAVIGATION_ID = "budgetbuddy-mobile-navigation";

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
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeToCollapsedState,
    getCollapsedSnapshot,
    () => false,
  );
  const activeNavItem = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    document.body.classList.toggle("app-mobile-nav-open", mobileNavigationOpen);

    return () => {
      document.body.classList.remove("app-mobile-nav-open");
    };
  }, [mobileNavigationOpen]);

  function toggleNavigation() {
    window.localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(NAV_COLLAPSED_EVENT));
  }

  return (
    <div
      className={`app-shell ${collapsed ? "app-shell-collapsed" : ""} ${
        mobileNavigationOpen ? "app-shell-mobile-open" : ""
      }`}
    >
      <header className="app-mobile-topbar">
        <div className="app-mobile-brand" aria-label="BudgetBuddy">
          <span className="app-brand-dot" aria-hidden="true" />
          <span>BudgetBuddy</span>
        </div>
        <p className="app-mobile-section">{activeNavItem?.label ?? "Navigation"}</p>
        <button
          type="button"
          className="app-mobile-menu-button"
          aria-controls={MOBILE_NAVIGATION_ID}
          aria-expanded={mobileNavigationOpen}
          aria-label={mobileNavigationOpen ? "Navigation schliessen" : "Navigation oeffnen"}
          onClick={() => setMobileNavigationOpen((open) => !open)}
        >
          <span className="app-nav-toggle-icon" aria-hidden="true" />
        </button>
      </header>

      <button
        type="button"
        className="app-mobile-nav-backdrop"
        aria-label="Navigation schliessen"
        tabIndex={mobileNavigationOpen ? 0 : -1}
        onClick={() => setMobileNavigationOpen(false)}
      />

      <aside id={MOBILE_NAVIGATION_ID} className="app-sidebar" aria-label="App-Shell">
        <div className="app-brand-row">
          <span className="app-brand-dot" aria-hidden="true" />
          <div className="app-brand-copy">
            <p>BudgetBuddy</p>
          </div>
          <button
            type="button"
            className="app-nav-toggle app-nav-toggle-desktop"
            aria-label={getNavigationToggleLabel(collapsed)}
            aria-expanded={!collapsed}
            onClick={toggleNavigation}
          >
            <span className="app-nav-toggle-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="app-mobile-drawer-close"
            aria-label="Navigation schliessen"
            onClick={() => setMobileNavigationOpen(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <AppNavigation collapsed={collapsed} onNavigate={() => setMobileNavigationOpen(false)} />
      </aside>

      <div className="app-content-frame">
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
