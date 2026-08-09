export type FixedCostVariance =
  | {
      state: "under-plan";
      amountCents: number;
      label: "Noch nicht als Fixkosten gebucht";
    }
  | {
      state: "on-plan";
      amountCents: 0;
      label: "Plan und Ist stimmen überein";
    }
  | {
      state: "over-plan";
      amountCents: number;
      label: "Fixkosten-Ist liegt über Plan";
    };

export function getFixedCostVariance(
  plannedFixedCostsCents: number,
  actualFixedCostsCents: number,
): FixedCostVariance {
  if (actualFixedCostsCents < plannedFixedCostsCents) {
    return {
      state: "under-plan",
      amountCents: plannedFixedCostsCents - actualFixedCostsCents,
      label: "Noch nicht als Fixkosten gebucht",
    };
  }

  if (actualFixedCostsCents > plannedFixedCostsCents) {
    return {
      state: "over-plan",
      amountCents: actualFixedCostsCents - plannedFixedCostsCents,
      label: "Fixkosten-Ist liegt über Plan",
    };
  }

  return {
    state: "on-plan",
    amountCents: 0,
    label: "Plan und Ist stimmen überein",
  };
}
