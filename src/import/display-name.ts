export type ImportDisplayAliasMatcher = {
  pattern: string;
  displayName: string;
};

type DisplayNameInput = {
  sourceType?: "manual" | "import";
  description: string;
  counterpartyName?: string | null;
  aliases?: ImportDisplayAliasMatcher[];
};

const TECHNICAL_PREFIXES = [
  "FOLGELASTSCHRIFT",
  "SEPA-ELV-LASTSCHRIFT",
  "KARTENZAHLUNG",
  "DIGITALE KARTE",
  "GUTSCHRIFT UEBERWEISUNG",
  "ECHTZEIT-GUTSCHRIFT",
  "UEBERWEISUNG",
  "LASTSCHRIFT",
];

const FILLER_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\b/gi,
  /\bT\d{2}:\d{2}(?::\d{2})?\b/gi,
  /\b\d{4}-\d{2}\b/g,
  /\bDER\s+EINZUG\s+ERFOLGT\s+IM\s+NAMEN\s+UND\s+AUF\s+RECHNUNG\s+DER\s+PAYONE\s+GMBH\b/gi,
  /\bIHR\s+EINKAUF\s+BEI\b/gi,
  /\bDEBITK\.\d+\b/gi,
  /\bDEBITMASTERCARD\b/gi,
  /\bELV\d+\b/gi,
  /\bME\d+\b/gi,
  /\b\d{2}\.\d{2}\s+\d{2}\.\d{2}\b/g,
  /\b\d{6,}\b/g,
  /\b[A-Z0-9]{12,}\b/g,
];

const COUNTERPARTY_FILLER_PATTERNS = [
  /\bSAGT\s+DANKE\b/gi,
  /\bDANKT\b/gi,
];

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTechnicalPrefix(value: string): string {
  const normalized = value.trim();
  const prefixPattern = new RegExp(
    `^(${TECHNICAL_PREFIXES.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*(\\|)?\\s*`,
    "i",
  );

  return normalized.replace(prefixPattern, "").trim();
}

function removeFillers(value: string): string {
  let cleaned = value;

  for (const pattern of FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  return normalizeWhitespace(cleaned.replace(/[|_]+/g, " "));
}

function removeCounterpartyFillers(value: string): string {
  let cleaned = removeFillers(value);

  for (const pattern of COUNTERPARTY_FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  return normalizeWhitespace(cleaned);
}

function removeLeadingReferenceNoise(value: string): string {
  return normalizeWhitespace(
    value.replace(/^(?:\d{2,}[-\s/]*)+\s*/i, ""),
  );
}

function titleCaseMerchant(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length === 0) {
    return normalized;
  }

  return normalized
    .split(" ")
    .map((part) => {
      if (/^N26-FIX\.?$/i.test(part)) {
        return part.endsWith(".") ? "N26-Fix." : "N26-Fix";
      }

      if (part.length <= 4 && /^[A-Z0-9]+$/.test(part)) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function splitSparkasseDescription(description: string): {
  original: string;
  bookingText: string;
  purpose: string;
} {
  const original = normalizeWhitespace(description);
  const [bookingText = "", ...purposeParts] = original.split("|");

  return {
    original,
    bookingText: normalizeWhitespace(bookingText),
    purpose: normalizeWhitespace(purposeParts.join(" | ")),
  };
}

function hasMeaningfulCounterparty(counterpartyName?: string | null): counterpartyName is string {
  if (!counterpartyName) {
    return false;
  }

  const normalized = normalizeForMatch(counterpartyName);
  return normalized.length > 0 && normalized !== "OHNE GEGENPARTEI";
}

function isCardBookingText(bookingText: string): boolean {
  const normalized = normalizeForMatch(bookingText);
  return (
    normalized.includes("DIGITALE KARTE") ||
    normalized.includes("DIG KARTE") ||
    normalized.includes("KARTENZAHLUNG") ||
    normalized.includes("APPLE PAY")
  );
}

function isElvBookingText(bookingText: string): boolean {
  const normalized = normalizeForMatch(bookingText);
  return normalized.includes("SEPA ELV") || normalized.includes("ELV LASTSCHRIFT");
}

function isTransferBookingText(bookingText: string): boolean {
  const normalized = normalizeForMatch(bookingText);
  return (
    normalized.includes("UEBERWEISUNG") ||
    normalized.includes("DAUERAUFTRAG") ||
    normalized.includes("ECHTZEIT UEBERWEISUNG")
  );
}

function containsFixedCostControlPattern(value: string): boolean {
  const normalized = normalizeForMatch(value);
  return normalized.includes("N26 FIX") || normalized.includes("FIXKOSTEN KONTROLLE");
}

function cleanedPurposeCandidate(purpose: string): string {
  return removeLeadingReferenceNoise(removeFillers(stripTechnicalPrefix(purpose)));
}

function isTechnicalOnlyPurpose(purpose: string): boolean {
  const cleaned = cleanedPurposeCandidate(purpose);
  const normalized = normalizeForMatch(cleaned);

  if (normalized.length < 3) {
    return true;
  }

  if (!/[A-Z]/.test(normalized)) {
    return true;
  }

  return /^(ME|ELV|DEBITK|DEBITMASTERCARD)(\s|\d|$)/.test(normalized);
}

function displayNameFromCounterparty(counterpartyName: string): string {
  const cleaned = removeCounterpartyFillers(counterpartyName);
  return titleCaseMerchant(cleaned.length >= 2 ? cleaned : counterpartyName);
}

function displayNameFromPurposeOrDescription(description: string): string {
  const parsed = splitSparkasseDescription(description);
  const preferredSegment = parsed.purpose.length > 0 ? parsed.purpose : parsed.original;
  const withoutPrefix = stripTechnicalPrefix(preferredSegment);
  const withoutNoise = removeLeadingReferenceNoise(removeFillers(withoutPrefix));
  const fallback = removeFillers(stripTechnicalPrefix(parsed.original));
  const candidate = withoutNoise.length >= 2 ? withoutNoise : fallback;

  return titleCaseMerchant(candidate.length >= 2 ? candidate : parsed.original);
}

export function buildHeuristicImportDisplayName(
  description: string,
  counterpartyName?: string | null,
): string {
  const { original, bookingText, purpose } = splitSparkasseDescription(description);
  if (original.length === 0) {
    return original;
  }

  if (containsFixedCostControlPattern(original)) {
    return displayNameFromPurposeOrDescription(original);
  }

  if (hasMeaningfulCounterparty(counterpartyName)) {
    if (isCardBookingText(bookingText)) {
      return displayNameFromCounterparty(counterpartyName);
    }

    if (isElvBookingText(bookingText) && isTechnicalOnlyPurpose(purpose)) {
      return displayNameFromCounterparty(counterpartyName);
    }
  }

  if (isTransferBookingText(bookingText) && purpose.length > 0 && !isTechnicalOnlyPurpose(purpose)) {
    return displayNameFromPurposeOrDescription(original);
  }

  return displayNameFromPurposeOrDescription(original);
}

export function resolveImportDisplayName(input: DisplayNameInput): string {
  const original = normalizeWhitespace(input.description);

  if (input.sourceType && input.sourceType !== "import") {
    return original;
  }

  const heuristic = buildHeuristicImportDisplayName(original, input.counterpartyName);
  const haystack = normalizeForMatch(
    [original, heuristic, input.counterpartyName ?? ""].join(" "),
  );
  const aliases = [...(input.aliases ?? [])].sort(
    (left, right) =>
      normalizeForMatch(right.pattern).length - normalizeForMatch(left.pattern).length,
  );

  for (const alias of aliases) {
    const needle = normalizeForMatch(alias.pattern);
    if (needle.length >= 2 && haystack.includes(needle)) {
      return alias.displayName.trim();
    }
  }

  return heuristic.length > 0 ? heuristic : original;
}
