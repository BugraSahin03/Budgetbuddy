"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, NAV_ITEMS } from "@/app/components/navigation-config";

type AppNavigationProps = {
  collapsed?: boolean;
};

export function AppNavigation({ collapsed = false }: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Hauptnavigation">
      <ul className="app-nav-list">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`app-nav-link ${active ? "app-nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="app-nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
