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
  /\bDER\s+EINZUG\s+ERFOLGT\s+IM\s+NAMEN\s+UND\s+AUF\s+RECHNUNG\s+DER\s+PAYONE\s+GMBH\b/gi,
  /\bIHR\s+EINKAUF\s+BEI\b/gi,
  /\bDEBITK\.\d+\b/gi,
  /\bELV\d+\b/gi,
  /\b\d{2}\.\d{2}\s+\d{2}\.\d{2}\b/g,
  /\b\d{6,}\b/g,
  /\b[A-Z0-9]{12,}\b/g,
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
      if (part.length <= 4 && /^[A-Z0-9]+$/.test(part)) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function buildHeuristicImportDisplayName(description: string): string {
  const original = normalizeWhitespace(description);
  if (original.length === 0) {
    return original;
  }

  const preferredSegment = original.includes("|")
    ? original.split("|").slice(1).join(" ")
    : original;
  const withoutPrefix = stripTechnicalPrefix(preferredSegment);
  const withoutNoise = removeLeadingReferenceNoise(removeFillers(withoutPrefix));
  const fallback = removeFillers(stripTechnicalPrefix(original));
  const candidate = withoutNoise.length >= 2 ? withoutNoise : fallback;

  return titleCaseMerchant(candidate.length >= 2 ? candidate : original);
}

export function resolveImportDisplayName(input: DisplayNameInput): string {
  const original = normalizeWhitespace(input.description);

  if (input.sourceType && input.sourceType !== "import") {
    return original;
  }

  const heuristic = buildHeuristicImportDisplayName(original);
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
