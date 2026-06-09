import { describe, expect, it } from "vitest";

import {
  NAV_COLLAPSED_STORAGE_KEY,
  isActivePath,
  getNavigationToggleLabel,
  NAV_ITEMS,
} from "@/app/components/navigation-config";

describe("navigation config", () => {
  it("contains the budgets tab", () => {
    expect(NAV_ITEMS).toContainEqual({ href: "/budgets", label: "Budgets" });
  });

  it("does not keep duplicate admin tabs for categories and special budgets", () => {
    expect(NAV_ITEMS.some((item) => item.href === "/kategorien")).toBe(false);
    expect(NAV_ITEMS.some((item) => item.href === "/sonderbudgets")).toBe(false);
  });

  it("contains the months tab", () => {
    expect(NAV_ITEMS).toContainEqual({ href: "/monate", label: "Monate" });
  });

  it("contains the month comparison tab", () => {
    expect(NAV_ITEMS).toContainEqual({ href: "/monatsvergleich", label: "Monatsvergleich" });
  });

  it("keeps a stable local storage key for collapsed navigation", () => {
    expect(NAV_COLLAPSED_STORAGE_KEY).toBe("budgetbuddy:navigation-collapsed");
  });

  it("describes the navigation toggle state accessibly", () => {
    expect(getNavigationToggleLabel(false)).toBe("Navigation einklappen");
    expect(getNavigationToggleLabel(true)).toBe("Navigation ausklappen");
  });

  it("does not expose transaction and import as main navigation tabs", () => {
    expect(NAV_ITEMS.some((item) => item.href === "/transaktionen")).toBe(false);
    expect(NAV_ITEMS.some((item) => item.href === "/import")).toBe(false);
    expect(NAV_ITEMS.some((item) => item.label === "Transaktionen")).toBe(false);
    expect(NAV_ITEMS.some((item) => item.label === "Import")).toBe(false);
  });

  it("matches top-level budgets path as active", () => {
    expect(isActivePath("/budgets", "/budgets")).toBe(true);
    expect(isActivePath("/", "/budgets")).toBe(false);
  });

  it("matches top-level and nested month paths as active", () => {
    expect(isActivePath("/monate", "/monate")).toBe(true);
    expect(isActivePath("/monate/2031-04", "/monate")).toBe(true);
    expect(isActivePath("/", "/monate")).toBe(false);
  });

  it("matches month comparison path as active", () => {
    expect(isActivePath("/monatsvergleich", "/monatsvergleich")).toBe(true);
    expect(isActivePath("/", "/monatsvergleich")).toBe(false);
  });
});
