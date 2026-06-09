export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", shortLabel: "DA" },
  { href: "/monate", label: "Monate", shortLabel: "MO" },
  { href: "/monatsvergleich", label: "Monatsvergleich", shortLabel: "MV" },
  { href: "/budgets", label: "Budgets", shortLabel: "BU" },
  { href: "/fixkosten", label: "Fixkosten", shortLabel: "FI" },
  { href: "/einstellungen", label: "Einstellungen", shortLabel: "ES" },
] as const;

export const NAV_COLLAPSED_STORAGE_KEY = "budgetbuddy:navigation-collapsed";

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavigationToggleLabel(collapsed: boolean): string {
  return collapsed ? "Navigation ausklappen" : "Navigation einklappen";
}
