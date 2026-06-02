export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/monate", label: "Monate" },
  { href: "/monatsvergleich", label: "Monatsvergleich" },
  { href: "/budgets", label: "Budgets" },
  { href: "/transaktionen", label: "Transaktionen" },
  { href: "/import", label: "Import" },
  { href: "/fixkosten", label: "Fixkosten" },
  { href: "/einstellungen", label: "Einstellungen" },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
