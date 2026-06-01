export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/monate", label: "Monate" },
  { href: "/budgets", label: "Budgets" },
  { href: "/transaktionen", label: "Transaktionen" },
  { href: "/import", label: "Import" },
  { href: "/kategorien", label: "Kategorien" },
  { href: "/sonderbudgets", label: "Sonderbudgets" },
  { href: "/fixkosten", label: "Fixkosten" },
  { href: "/einstellungen", label: "Einstellungen" },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
