import type { CSSProperties } from "react";

export type CategoryUsageTone = "missing" | "safe" | "watch" | "near" | "over";

export type CategoryUsageInput = {
  budgetAmountCents: number | null;
  spentAmountCents: number;
};

export type CategoryUsageState = {
  label: string;
  percent: number;
  progressPercent: number;
  tone: CategoryUsageTone;
};

const TONE_STYLES: Record<
  CategoryUsageTone,
  {
    chipClassName: string;
    progressStyle: CSSProperties;
    surfaceStyle: CSSProperties;
  }
> = {
  missing: {
    chipClassName: "border-slate-200 bg-white/80 text-slate-600",
    progressStyle: {
      background: "linear-gradient(90deg, #CBD5E1, #E2E8F0)",
    },
    surfaceStyle: {
      backgroundColor: "rgba(248, 250, 252, 0.9)",
      borderColor: "rgba(148, 163, 184, 0.28)",
    },
  },
  safe: {
    chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    progressStyle: {
      background: "linear-gradient(90deg, #34D399, #5EEAD4)",
    },
    surfaceStyle: {
      backgroundColor: "rgba(236, 253, 245, 0.68)",
      borderColor: "rgba(52, 211, 153, 0.28)",
    },
  },
  watch: {
    chipClassName: "border-yellow-200 bg-yellow-50 text-yellow-800",
    progressStyle: {
      background: "linear-gradient(90deg, #FACC15, #FDE68A)",
    },
    surfaceStyle: {
      backgroundColor: "rgba(254, 252, 232, 0.76)",
      borderColor: "rgba(250, 204, 21, 0.32)",
    },
  },
  near: {
    chipClassName: "border-orange-200 bg-orange-50 text-orange-800",
    progressStyle: {
      background: "linear-gradient(90deg, #FB923C, #FDBA74)",
    },
    surfaceStyle: {
      backgroundColor: "rgba(255, 247, 237, 0.78)",
      borderColor: "rgba(251, 146, 60, 0.34)",
    },
  },
  over: {
    chipClassName: "border-red-200 bg-red-50 text-red-700",
    progressStyle: {
      background: "linear-gradient(90deg, #F87171, #FB7185)",
    },
    surfaceStyle: {
      backgroundColor: "rgba(254, 242, 242, 0.82)",
      borderColor: "rgba(248, 113, 113, 0.36)",
    },
  },
};

export function getCategoryUsageState({
  budgetAmountCents,
  spentAmountCents,
}: CategoryUsageInput): CategoryUsageState {
  if (budgetAmountCents === null || budgetAmountCents <= 0) {
    return {
      label: "Budget fehlt",
      percent: 0,
      progressPercent: 0,
      tone: "missing",
    };
  }

  const normalizedSpentAmountCents = Math.max(0, spentAmountCents);
  const percent = Math.max(
    0,
    Math.round((normalizedSpentAmountCents / budgetAmountCents) * 100),
  );
  const progressPercent = Math.min(100, percent);

  if (normalizedSpentAmountCents > budgetAmountCents) {
    return {
      label: "Über Budget",
      percent,
      progressPercent,
      tone: "over",
    };
  }

  if (percent >= 90) {
    return {
      label: "Nahe am Limit",
      percent,
      progressPercent,
      tone: "near",
    };
  }

  if (percent >= 70) {
    return {
      label: "Beobachten",
      percent,
      progressPercent,
      tone: "watch",
    };
  }

  return {
    label: "Im Rahmen",
    percent,
    progressPercent,
    tone: "safe",
  };
}

export function categoryUsageChipClassName(state: CategoryUsageState): string {
  return TONE_STYLES[state.tone].chipClassName;
}

export function categoryUsageProgressStyle(state: CategoryUsageState): CSSProperties {
  return TONE_STYLES[state.tone].progressStyle;
}

export function categoryUsageSurfaceStyle(state: CategoryUsageState): CSSProperties {
  return TONE_STYLES[state.tone].surfaceStyle;
}
