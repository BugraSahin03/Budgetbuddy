import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}), { virtual: true });

const { parseSparkasseCsvToPreview } = await import("@/src/import/sparkasse-csv");

const SAMPLE_CSV = `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00111111110000000001";"24.04.26";"24.04.26";"DIG. KARTE (APPLE PAY)";"2026-04-23T20:21 Debitk.10 2029-12 ";"";"";"651";"";"";"";"SUPERMARKT A";"DE002";"BANKDEFFXXX";"-3,58";"EUR";"Umsatz gebucht"`;

describe("sparkasse csv parser", () => {
  it("parses preview rows with normalized fields", () => {
    const result = parseSparkasseCsvToPreview(SAMPLE_CSV);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      accountIban: "DE00111111110000000001",
      bookingDate: "2026-04-24",
      valueDate: "2026-04-24",
      bookingText: "DIG. KARTE (APPLE PAY)",
      purpose: "2026-04-23T20:21 Debitk.10 2029-12",
      counterpartyIban: "DE002",
      counterpartyBic: "BANKDEFFXXX",
      amountCents: -358,
      currencyCode: "EUR",
      description: "DIG. KARTE (APPLE PAY) | 2026-04-23T20:21 Debitk.10 2029-12",
      counterparty: "SUPERMARKT A",
      info: "Umsatz gebucht",
      endToEndReference: "651",
      mandateReference: "",
    });
  });

  it("returns clear error for missing required headers", () => {
    const result = parseSparkasseCsvToPreview("\"Foo\";\"Bar\"\n\"a\";\"b\"");

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("Fehlende CSV-Spalten");
  });

  it("collects row-level parsing errors", () => {
    const invalidDateCsv = SAMPLE_CSV.replace("24.04.26", "2026-04-24");
    const result = parseSparkasseCsvToPreview(invalidDateCsv);

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("Zeile 2");
    expect(result.errors[0]).toContain("Ungueltiges Datumsformat");
  });
});
