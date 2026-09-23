import { describe, expect, it } from "vitest";

import { buildMonthBookingHistory } from "@/src/months/booking-history";

describe("month booking history", () => {
  it("places newer imported transactions before an older settlement", () => {
    const history = buildMonthBookingHistory(
      [
        { id: 425, bookingDate: "2026-09-21" },
        { id: 408, bookingDate: "2026-09-18" },
      ],
      [{ id: 1, bookingDate: "2026-09-17" }],
    );

    expect(
      history.map((entry) =>
        entry.kind === "transaction"
          ? `transaction:${entry.transaction.id}`
          : `settlement:${entry.group.id}`,
      ),
    ).toEqual(["transaction:425", "transaction:408", "settlement:1"]);
  });

  it("places a newer settlement between transactions by booking date", () => {
    const history = buildMonthBookingHistory(
      [
        { id: 3, bookingDate: "2026-09-21" },
        { id: 2, bookingDate: "2026-09-17" },
      ],
      [{ id: 7, bookingDate: "2026-09-19" }],
    );

    expect(history.map((entry) => entry.bookingDate)).toEqual([
      "2026-09-21",
      "2026-09-19",
      "2026-09-17",
    ]);
  });

  it("preserves the established order within the same booking date", () => {
    const transactions = [
      { id: 12, bookingDate: "2026-09-21" },
      { id: 11, bookingDate: "2026-09-21" },
    ];
    const settlements = [
      { id: 5, bookingDate: "2026-09-21" },
      { id: 4, bookingDate: "2026-09-21" },
    ];

    const history = buildMonthBookingHistory(transactions, settlements);

    expect(
      history.map((entry) =>
        entry.kind === "transaction"
          ? `transaction:${entry.transaction.id}`
          : `settlement:${entry.group.id}`,
      ),
    ).toEqual([
      "settlement:5",
      "settlement:4",
      "transaction:12",
      "transaction:11",
    ]);
    expect(transactions.map((transaction) => transaction.id)).toEqual([12, 11]);
    expect(settlements.map((settlement) => settlement.id)).toEqual([5, 4]);
  });
});
