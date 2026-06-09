export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/monate", label: "Monate" },
  { href: "/monatsvergleich", label: "Monatsvergleich" },
  { href: "/budgets", label: "Budgets" },
  { href: "/fixkosten", label: "Fixkosten" },
  { href: "/einstellungen", label: "Einstellungen" },
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
