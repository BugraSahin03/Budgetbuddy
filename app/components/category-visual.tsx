import type { CSSProperties } from "react";

export type CategoryVisualInput = {
  name: string;
  iconName?: string | null;
  colorHex?: string | null;
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const FALLBACK_COLOR = "#DDF7ED";
const FALLBACK_TEXT_COLOR = "#14532D";

export function categoryFallbackIcon(name: string): string {
  const normalized = name.trim();
  const letters = Array.from(normalized).filter((char) => /[\p{L}\p{N}]/u.test(char));

  return letters.slice(0, 2).join("").toUpperCase() || "#";
}

export function categoryDisplayIcon({ name, iconName }: CategoryVisualInput): string {
  const normalizedIcon = iconName?.trim() ?? "";

  if (normalizedIcon.length === 0) {
    return categoryFallbackIcon(name);
  }

  return Array.from(normalizedIcon).slice(0, 2).join("");
}

export function normalizeCategoryColor(colorHex?: string | null): string | null {
  const normalized = colorHex?.trim() ?? "";

  if (!HEX_COLOR_PATTERN.test(normalized)) {
    return null;
  }

  return normalized.toUpperCase();
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function readableTextColor(hex: string): string {
  const { red, green, blue } = hexToRgb(hex);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.58 ? "#14213D" : "#FFFFFF";
}

export function categoryAccentStyle(colorHex?: string | null): CSSProperties {
  const normalizedColor = normalizeCategoryColor(colorHex);

  if (!normalizedColor) {
    return {
      backgroundColor: FALLBACK_COLOR,
      color: FALLBACK_TEXT_COLOR,
      borderColor: "rgba(20, 83, 45, 0.18)",
    };
  }

  return {
    backgroundColor: normalizedColor,
    color: readableTextColor(normalizedColor),
    borderColor: normalizedColor,
  };
}

export function categorySoftStyle(colorHex?: string | null): CSSProperties {
  const normalizedColor = normalizeCategoryColor(colorHex);

  if (!normalizedColor) {
    return {
      backgroundColor: "rgba(221, 247, 237, 0.78)",
      borderColor: "rgba(20, 83, 45, 0.16)",
    };
  }

  return {
    backgroundColor: `${normalizedColor}1F`,
    borderColor: `${normalizedColor}66`,
  };
}

export function categoryProgressStyle(colorHex?: string | null): CSSProperties {
  const normalizedColor = normalizeCategoryColor(colorHex);

  if (!normalizedColor) {
    return {
      background: "linear-gradient(90deg, #34D399, #5EEAD4)",
    };
  }

  return {
    background: `linear-gradient(90deg, ${normalizedColor}, ${normalizedColor}B3)`,
  };
}

export function CategoryVisualMark({
  name,
  iconName,
  colorHex,
  className = "",
  title,
}: CategoryVisualInput & {
  className?: string;
  title?: string;
}) {
  return (
    <span
      aria-label={title ?? `${name} Icon`}
      className={`category-visual-mark ${className}`.trim()}
      style={categoryAccentStyle(colorHex)}
      title={title ?? name}
    >
      {categoryDisplayIcon({ name, iconName })}
    </span>
  );
}
