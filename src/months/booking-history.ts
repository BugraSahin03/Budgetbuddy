type DatedBooking = {
  bookingDate: string;
};

export type MonthBookingHistoryEntry<
  Transaction extends DatedBooking,
  Settlement extends DatedBooking,
> =
  | {
      kind: "settlement";
      bookingDate: string;
      group: Settlement;
    }
  | {
      kind: "transaction";
      bookingDate: string;
      transaction: Transaction;
    };

export function buildMonthBookingHistory<
  Transaction extends DatedBooking,
  Settlement extends DatedBooking,
>(
  transactions: readonly Transaction[],
  settlementGroups: readonly Settlement[],
): Array<MonthBookingHistoryEntry<Transaction, Settlement>> {
  const entries = [
    ...settlementGroups.map((group, index) => ({
      kind: "settlement" as const,
      bookingDate: group.bookingDate,
      sequence: index,
      group,
    })),
    ...transactions.map((transaction, index) => ({
      kind: "transaction" as const,
      bookingDate: transaction.bookingDate,
      sequence: settlementGroups.length + index,
      transaction,
    })),
  ];

  return entries
    .sort(
      (first, second) =>
        second.bookingDate.localeCompare(first.bookingDate) ||
        first.sequence - second.sequence,
    )
    .map((entry) =>
      entry.kind === "settlement"
        ? {
            kind: entry.kind,
            bookingDate: entry.bookingDate,
            group: entry.group,
          }
        : {
            kind: entry.kind,
            bookingDate: entry.bookingDate,
            transaction: entry.transaction,
          },
    );
}
