import { describe, expect, it } from "vitest";

import {
  categoryAccentStyle,
  categoryDisplayIcon,
  categoryFallbackIcon,
  categoryNeutralMarkStyle,
  categoryProgressStyle,
  normalizeCategoryColor,
} from "@/app/components/category-visual";

describe("category visual helpers", () => {
  it("uses a maintained icon and limits long icon text defensively", () => {
    expect(categoryDisplayIcon({ name: "Einkauf", iconName: "🛒" })).toBe("🛒");
    expect(categoryDisplayIcon({ name: "Fitness", iconName: "FITNESS" })).toBe("FI");
  });

  it("builds a calm fallback from the category name when no icon is set", () => {
    expect(categoryDisplayIcon({ name: "Tanken", iconName: "" })).toBe("TA");
    expect(categoryFallbackIcon("  ")).toBe("#");
  });

  it("accepts valid category colors and ignores invalid values", () => {
    expect(normalizeCategoryColor("#1d4ed8")).toBe("#1D4ED8");
    expect(normalizeCategoryColor("not-a-color")).toBeNull();
  });

  it("returns safe styles for present and missing colors", () => {
    expect(categoryAccentStyle("#1D4ED8")).toMatchObject({
      backgroundColor: "#1D4ED8",
      borderColor: "#1D4ED8",
    });
    expect(categoryAccentStyle(null)).toMatchObject({
      backgroundColor: "#DDF7ED",
    });
    expect(categoryProgressStyle(null)).toMatchObject({
      background: "linear-gradient(90deg, #34D399, #5EEAD4)",
    });
  });

  it("keeps neutral category marks independent from category colors", () => {
    expect(categoryNeutralMarkStyle()).toMatchObject({
      backgroundColor: "rgba(223, 244, 253, 0.92)",
      borderWidth: "2px",
      color: "#14213D",
    });
    expect(categoryProgressStyle("#1D4ED8")).toMatchObject({
      background: "linear-gradient(90deg, #1D4ED8, #1D4ED8B3)",
    });
  });
});
