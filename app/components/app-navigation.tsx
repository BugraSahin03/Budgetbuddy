"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, NAV_ITEMS } from "@/app/components/navigation-config";

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="px-3 py-4" aria-label="Hauptnavigation">
      <ul className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <li key={item.href} className="shrink-0 md:shrink">
              <Link
                href={item.href}
                className={`block rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-sky-300 bg-sky-100 text-slate-900"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
