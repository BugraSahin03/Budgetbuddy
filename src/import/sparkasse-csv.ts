import "server-only";

export type SparkasseCsvRow = {
  accountIban: string;
  bookingDate: string;
  valueDate: string;
  bookingText: string;
  purpose: string;
  counterparty: string;
  counterpartyIban: string;
  counterpartyBic: string;
  amountCents: number;
  currencyCode: string;
  info: string;
  endToEndReference: string;
  mandateReference: string;
  description: string;
};

export type SparkassePreviewRow = {
  bookingDate: string;
  amountCents: number;
  description: string;
  counterparty: string;
  info: string;
};

export type SparkasseParseResult = {
  rows: SparkasseCsvRow[];
  errors: string[];
};

const REQUIRED_HEADERS = [
  "Auftragskonto",
  "Buchungstag",
  "Valutadatum",
  "Buchungstext",
  "Verwendungszweck",
  "Beguenstigter/Zahlungspflichtiger",
  "Kontonummer/IBAN",
  "BIC (SWIFT-Code)",
  "Betrag",
  "Waehrung",
  "Info",
  "Kundenreferenz (End-to-End)",
  "Mandatsreferenz",
] as const;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const isEscapedQuote = inQuotes && line[index + 1] === '"';

      if (isEscapedQuote) {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ";" && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseGermanDate(rawDate: string): string {
  const normalized = rawDate.trim();
  const match = /^(\d{2})\.(\d{2})\.(\d{2})$/.exec(normalized);

  if (!match) {
    throw new Error(`Ungueltiges Datumsformat: ${rawDate}`);
  }

  const day = match[1];
  const month = match[2];
  const year = Number.parseInt(match[3], 10);
  const fullYear = year >= 70 ? 1900 + year : 2000 + year;

  return `${fullYear}-${month}-${day}`;
}

function parseAmountCents(rawAmount: string): number {
  const normalized = rawAmount.trim().replace(".", "").replace(",", ".");

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Ungueltiges Betragsformat: ${rawAmount}`);
  }

  const asNumber = Number.parseFloat(normalized);

  if (!Number.isFinite(asNumber) || asNumber === 0) {
    throw new Error(`Betrag darf nicht 0 oder ungueltig sein: ${rawAmount}`);
  }

  return Math.round(asNumber * 100);
}

function combineDescription(bookingText: string, purpose: string): string {
  const values = [bookingText.trim(), purpose.trim()].filter((value) => value.length > 0);
  return values.join(" | ");
}

export function parseSparkasseCsvToPreview(fileContent: string): SparkasseParseResult {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["CSV enthaelt keine Buchungszeilen."],
    };
  }

  const headerCells = parseCsvLine(lines[0]);
  const headerIndex = new Map<string, number>();

  headerCells.forEach((header, index) => {
    headerIndex.set(header, index);
  });

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerIndex.has(header));

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [`Fehlende CSV-Spalten: ${missingHeaders.join(", ")}`],
    };
  }

  const rows: SparkasseCsvRow[] = [];
  const errors: string[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const cells = parseCsvLine(line);

    try {
      const bookingDate = parseGermanDate(cells[headerIndex.get("Buchungstag") ?? -1] ?? "");
      const valueDate = parseGermanDate(cells[headerIndex.get("Valutadatum") ?? -1] ?? "");
      const amountCents = parseAmountCents(cells[headerIndex.get("Betrag") ?? -1] ?? "");
      const accountIban = cells[headerIndex.get("Auftragskonto") ?? -1]?.trim() ?? "";
      const bookingText = cells[headerIndex.get("Buchungstext") ?? -1] ?? "";
      const purpose = cells[headerIndex.get("Verwendungszweck") ?? -1] ?? "";
      const counterparty =
        cells[headerIndex.get("Beguenstigter/Zahlungspflichtiger") ?? -1]?.trim() ||
        "(ohne Gegenpartei)";
      const counterpartyIban = cells[headerIndex.get("Kontonummer/IBAN") ?? -1]?.trim() ?? "";
      const counterpartyBic = cells[headerIndex.get("BIC (SWIFT-Code)") ?? -1]?.trim() ?? "";
      const currencyCode = cells[headerIndex.get("Waehrung") ?? -1]?.trim() || "EUR";
      const info = cells[headerIndex.get("Info") ?? -1]?.trim() || "";
      const endToEndReference =
        cells[headerIndex.get("Kundenreferenz (End-to-End)") ?? -1]?.trim() ?? "";
      const mandateReference = cells[headerIndex.get("Mandatsreferenz") ?? -1]?.trim() ?? "";

      rows.push({
        accountIban,
        bookingDate,
        valueDate,
        bookingText: bookingText.trim(),
        purpose: purpose.trim(),
        counterpartyIban,
        counterpartyBic,
        amountCents,
        currencyCode,
        description: combineDescription(bookingText, purpose),
        counterparty,
        info,
        endToEndReference,
        mandateReference,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      errors.push(`Zeile ${lineIndex + 1}: ${message}`);
    }
  }

  return { rows, errors };
}

export function mapSparkasseRowsToPreviewRows(rows: SparkasseCsvRow[]): SparkassePreviewRow[] {
  return rows.map((row) => ({
    bookingDate: row.bookingDate,
    amountCents: row.amountCents,
    description: row.description,
    counterparty: row.counterparty,
    info: row.info,
  }));
}
