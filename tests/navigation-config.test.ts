import { describe, expect, it } from "vitest";

import { isActivePath, NAV_ITEMS } from "@/app/components/navigation-config";

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
