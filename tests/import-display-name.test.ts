import { describe, expect, it } from "vitest";

import {
  buildHeuristicImportDisplayName,
  resolveImportDisplayName,
} from "@/src/import/display-name";

describe("FIN-059 import display names", () => {
  it("reduces technical Sparkasse and SEPA text with a defensive heuristic", () => {
    expect(
      buildHeuristicImportDisplayName(
        "SEPA-ELV-LASTSCHRIFT | IKEA 322 WALLAU SAGT DANKE 300517211160081291200003220 ELV65449109 30.05 17.21 Der Einzug erfolgt im Namen und auf Rechnung der PAYONE GmbH",
      ),
    ).toContain("IKEA");

    expect(
      buildHeuristicImportDisplayName(
        "FOLGELASTSCHRIFT | 028-7836718-2754737 AMZN Mktp DE 13X0LD9WC4FUA2SE",
      ),
    ).toContain("AMZN Mktp DE");
  });

  it("uses aliases against original and heuristic text without changing manual names", () => {
    const aliases = [
      { pattern: "AMZN", displayName: "Amazon" },
      { pattern: "IKEA 322", displayName: "IKEA" },
    ];

    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "FOLGELASTSCHRIFT | 028-7836718-2754737 AMZN Mktp DE 13X0LD9WC4FUA2SE",
        aliases,
      }),
    ).toBe("Amazon");

    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "SEPA-ELV-LASTSCHRIFT | IKEA 322 WALLAU SAGT DANKE 300517211160081291200003220",
        aliases,
      }),
    ).toBe("IKEA");

    expect(
      resolveImportDisplayName({
        sourceType: "manual",
        description: "FOLGELASTSCHRIFT | AMZN",
        aliases,
      }),
    ).toBe("FOLGELASTSCHRIFT | AMZN");
  });

  it("prefers the most specific alias pattern", () => {
    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "FOLGELASTSCHRIFT | AMZN Mktp DE 123456",
        aliases: [
          { pattern: "AMZN", displayName: "Amazon allgemein" },
          { pattern: "AMZN Mktp", displayName: "Amazon Marketplace" },
        ],
      }),
    ).toBe("Amazon Marketplace");
  });

  it("uses a transaction-specific override before aliases or heuristics", () => {
    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "FOLGELASTSCHRIFT | AMZN Mktp DE 123456",
        displayNameOverride: "Kindle Geschenk",
        aliases: [{ pattern: "AMZN", displayName: "Amazon" }],
      }),
    ).toBe("Kindle Geschenk");

    expect(
      resolveImportDisplayName({
        sourceType: "manual",
        description: "Manuelle alte Beschreibung",
        displayNameOverride: "Lesbarer manueller Name",
      }),
    ).toBe("Lesbarer manueller Name");
  });
});

describe("FIN-080 Sparkasse display-name heuristics", () => {
  it("uses the counterparty for card and Apple Pay rows with technical purpose text", () => {
    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "DIGITALE KARTE (APPLE PAY) | 2026-05-29T12:46 Debitk.10 2029-12",
        counterpartyName: "LIDL SAGT DANKE",
      }),
    ).toBe("LIDL");

    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "KARTENZAHLUNG | T12:46 2029-12 DebitMastercard",
        counterpartyName: "REWE SAGT DANKE",
      }),
    ).toBe("REWE");
  });

  it("uses the counterparty for SEPA-ELV rows when the purpose is only technical noise", () => {
    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description:
          "SEPA-ELV-LASTSCHRIFT | ELV50700063 29.05 15.21 ME11()JC89ZPFT6GM74ZW3 Der Einzug erfolgt im Namen und auf Rechnung der PAYONE GmbH",
        counterpartyName: "ALNATURA DANKT",
      }),
    ).toBe("Alnatura");
  });

  it("keeps meaningful transfer purposes as the visible name", () => {
    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "UEBERWEISUNG | Garage Juni 2026",
        counterpartyName: "Max Mustermann",
      }),
    ).toBe("Garage Juni 2026");

    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description: "DAUERAUFTRAG | Miete Juni 2026",
        counterpartyName: "Hausverwaltung Beispiel",
      }),
    ).toBe("Miete Juni 2026");
  });

  it("keeps N26 fixed-cost control text visible and alias-overridable without changing source text", () => {
    const description = "UEBERWEISUNG | N26-Fix. Monatsblock Juni 2026";

    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description,
        counterpartyName: "N26 Bank",
      }),
    ).toBe("N26-Fix. Monatsblock Juni 2026");

    expect(
      resolveImportDisplayName({
        sourceType: "import",
        description,
        counterpartyName: "N26 Bank",
        aliases: [{ pattern: "N26-Fix.", displayName: "N26-Fixkostenblock" }],
      }),
    ).toBe("N26-Fixkostenblock");
  });
});
