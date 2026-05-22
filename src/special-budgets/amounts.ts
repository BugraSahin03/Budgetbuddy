const STRICT_EURO_AMOUNT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export function parsePlannedAmountCents(rawInput: string): number {
  const normalizedInput = rawInput.trim();

  if (normalizedInput.length === 0) {
    throw new Error("Geplanter Betrag ist erforderlich.");
  }

  if (!STRICT_EURO_AMOUNT_PATTERN.test(normalizedInput)) {
    throw new Error("Geplanter Betrag ist ungueltig formatiert.");
  }

  const canonical = normalizedInput.replace(",", ".");
  const parsed = Number.parseFloat(canonical);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Geplanter Betrag muss 0 oder groesser sein.");
  }

  const cents = Math.round(parsed * 100);

  if (cents > 99_999_999) {
    throw new Error("Geplanter Betrag ist zu gross.");
  }

  return cents;
}
