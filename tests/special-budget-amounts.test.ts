import { describe, expect, it } from "vitest";

import { parsePlannedAmountCents } from "@/src/special-budgets/amounts";

describe("special budget amount parsing", () => {
  it("parses valid integer and decimal euro values", () => {
    expect(parsePlannedAmountCents("120")).toBe(12000);
    expect(parsePlannedAmountCents("120,5")).toBe(12050);
    expect(parsePlannedAmountCents("120.50")).toBe(12050);
    expect(parsePlannedAmountCents("0")).toBe(0);
  });

  it("rejects malformed inputs with trailing text or multiple separators", () => {
    expect(() => parsePlannedAmountCents("120abc")).toThrow(
      "Geplanter Betrag ist ungueltig formatiert.",
    );
    expect(() => parsePlannedAmountCents("1.2.3")).toThrow(
      "Geplanter Betrag ist ungueltig formatiert.",
    );
    expect(() => parsePlannedAmountCents("12,34,56")).toThrow(
      "Geplanter Betrag ist ungueltig formatiert.",
    );
  });

  it("rejects empty and negative values", () => {
    expect(() => parsePlannedAmountCents("")).toThrow(
      "Geplanter Betrag ist erforderlich.",
    );
    expect(() => parsePlannedAmountCents("   ")).toThrow(
      "Geplanter Betrag ist erforderlich.",
    );
    expect(() => parsePlannedAmountCents("-1")).toThrow(
      "Geplanter Betrag ist ungueltig formatiert.",
    );
  });
});
