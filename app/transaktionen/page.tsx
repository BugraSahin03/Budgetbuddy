import {
  createManualTransactionAction,
  updateManualTransactionAction,
} from "@/app/transaktionen/actions";
import {
  getCashAccountSnapshot,
  listActiveAccountOptions,
  listActiveCategoryOptions,
  listActiveSpecialBudgetOptionsForMonth,
  listManualTransactions,
  type TransactionListItem,
  type TransactionType,
} from "@/src/transactions/repository";
import { listImportedTransactions } from "@/src/import/repository";

export const dynamic = "force-dynamic";

type TransactionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function formatDateIso(value: string): string {
  return value;
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function toAmountInput(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2).replace(".", ",");
}

function statusFromRow(
  row: TransactionListItem,
): "Zugeordnet" | "Transfer" | "Einnahme" | "Zuordnen" {
  if (row.transactionType === "transfer") {
    return "Transfer";
  }

  if (row.transactionType === "income" || row.transactionType === "refund") {
    return "Einnahme";
  }

  if (row.categoryName || row.specialBudgetName) {
    return "Zugeordnet";
  }

  return "Zuordnen";
}

function statusBadgeClass(status: string): string {
  if (status === "Zuordnen") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Transfer") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (status === "Einnahme") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function toTypeLabel(transactionType: TransactionType): string {
  if (transactionType === "expense") return "Ausgabe";
  if (transactionType === "income") return "Einkommen";
  if (transactionType === "refund") return "Rückerstattung";
  return "Transfer";
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = (await searchParams) ?? {};
  const notice = toSingleParam(params.notice);
  const error = toSingleParam(params.error);

  const accountOptions = listActiveAccountOptions();
  const cashSnapshot = getCashAccountSnapshot();
  const categoryOptions = listActiveCategoryOptions();
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const defaultMonthKey = todayIsoDate.slice(0, 7);
  const defaultSpecialBudgetOptions = listActiveSpecialBudgetOptionsForMonth(defaultMonthKey);
  const manualTransactions = listManualTransactions();
  const importedTransactions = listImportedTransactions();
  const importedTransfers = importedTransactions.filter(
    (row) => row.transactionType === "transfer",
  );
  const importedNonTransfers = importedTransactions.filter(
    (row) => row.transactionType !== "transfer",
  );
  const importedOpenAssignments = importedTransactions.filter(
    (row) =>
      row.transactionType === "expense" &&
      row.categoryName === null &&
      row.specialBudgetName === null,
  ).length;

  let openAssignments = 0;
  const specialBudgetOptionsByMonth = new Map<string, ReturnType<typeof listActiveSpecialBudgetOptionsForMonth>>();

  for (const row of manualTransactions) {
    if (row.transactionType === "expense" && !row.categoryName && !row.specialBudgetName) {
      openAssignments += 1;
    }

    const rowMonthKey = row.effectiveMonthKey;
    if (!specialBudgetOptionsByMonth.has(rowMonthKey)) {
      specialBudgetOptionsByMonth.set(
        rowMonthKey,
        listActiveSpecialBudgetOptionsForMonth(rowMonthKey),
      );
    }
  }

  const defaultAccountId = accountOptions[0]?.id ?? "";
  const sparkasseAccountId =
    accountOptions.find((account) => account.name === "Sparkasse")?.id ?? defaultAccountId;
  const cashAccountId =
    accountOptions.find((account) => account.name === cashSnapshot.accountName)?.id ??
    defaultAccountId;

  return (
    <section className="transaction-fallback-shell space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Transaktionen</p>
            <h2 className="text-lg font-semibold text-slate-900">Manuelle Buchungen erfassen</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ausgaben brauchen genau eine Zuordnung zu Kategorie oder Sonderkategorie.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
              Manuelle Buchungen: {manualTransactions.length}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700">
              Bargeldbestand: {formatEuro(cashSnapshot.currentBalanceCents)}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
              Offen: {openAssignments}
            </span>
          </div>
        </div>
      </header>

      <form
        action={createManualTransactionAction}
        className="transaction-quick-transfer flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <input type="hidden" name="bookingDate" value={todayIsoDate} />
        <input type="hidden" name="effectiveMonthKey" value={defaultMonthKey} />
        <input type="hidden" name="transactionType" value="transfer" />
        <input type="hidden" name="accountId" value={sparkasseAccountId} />
        <input type="hidden" name="destinationAccountId" value={cashAccountId} />
        <input type="hidden" name="categoryId" value="" />
        <input type="hidden" name="specialBudgetId" value="" />
        <input type="hidden" name="description" value="Bargeldabhebung" />
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="quick-withdrawal-amount">
          Bargeldabhebung (Transfer Sparkasse -{">"} Bargeld)
        </label>
        <input
          id="quick-withdrawal-amount"
          name="amount"
          required
          inputMode="decimal"
          placeholder="50,00"
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200"
        >
          Abhebung als Transfer erfassen
        </button>
      </form>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        action={createManualTransactionAction}
        className="transaction-create-form grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-12"
      >
        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-date">Datum</label>
          <input id="new-date" type="date" name="bookingDate" required defaultValue={todayIsoDate} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-effective-month">
            Zielmonat
          </label>
          <input
            id="new-effective-month"
            name="effectiveMonthKey"
            defaultValue={defaultMonthKey}
            pattern="^\d{4}-(0[1-9]|1[0-2])$"
            placeholder="YYYY-MM"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-type">Typ</label>
          <select id="new-type" name="transactionType" defaultValue="expense" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="expense">Ausgabe</option>
            <option value="income">Einkommen</option>
            <option value="refund">Sonstige Einnahme</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-amount">Betrag (EUR)</label>
          <input id="new-amount" name="amount" required inputMode="decimal" placeholder="12,50" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-account">Konto</label>
          <select id="new-account" name="accountId" defaultValue={defaultAccountId} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-destination">Zielkonto (Transfer)</label>
          <select id="new-destination" name="destinationAccountId" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">-</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-category">Kategorie (Ausgabe)</label>
          <select id="new-category" name="categoryId" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">-</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-special-budget">Sonderkategorie ({defaultMonthKey})</label>
          <select id="new-special-budget" name="specialBudgetId" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">-</option>
            {defaultSpecialBudgetOptions.map((budget) => (
              <option key={budget.id} value={budget.id}>{budget.name}</option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-7">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="new-description">Beschreibung</label>
          <input id="new-description" name="description" required maxLength={140} placeholder="REWE Markt" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="xl:col-span-2 flex items-end">
          <button type="submit" className="w-full rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200">
            Transaktion erstellen
          </button>
        </div>
      </form>

      <div className="transaction-fallback-table-card overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="transaction-fallback-table min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-semibold">Datum</th>
              <th className="px-3 py-2 font-semibold">Typ</th>
              <th className="px-3 py-2 font-semibold">Buchung</th>
              <th className="px-3 py-2 font-semibold">Konto</th>
              <th className="px-3 py-2 font-semibold">Betrag</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {manualTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-600">
                  Noch keine manuellen Transaktionen vorhanden.
                </td>
              </tr>
            ) : (
              manualTransactions.map((row) => {
                const status = statusFromRow(row);
                const rowMonthKey = row.effectiveMonthKey;
                const rowSpecialBudgets = specialBudgetOptionsByMonth.get(rowMonthKey) ?? [];

                return (
                  <tr key={row.id}>
                    <td data-label="Datum" className="px-3 py-2 align-top">{formatDateIso(row.bookingDate)}</td>
                    <td data-label="Typ" className="px-3 py-2 align-top">{toTypeLabel(row.transactionType)}</td>
                    <td data-label="Buchung" className="px-3 py-2 align-top font-medium text-slate-900">{row.description}</td>
                    <td data-label="Konto" className="px-3 py-2 align-top text-slate-600">
                      {row.destinationAccountName ? `${row.accountName} -> ${row.destinationAccountName}` : row.accountName}
                    </td>
                    <td data-label="Betrag" className="px-3 py-2 align-top text-slate-900">{formatEuro(row.amountCents)}</td>
                    <td data-label="Status" className="px-3 py-2 align-top">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td data-label="Aktion" className="px-3 py-2">
                      <form action={updateManualTransactionAction} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <input type="hidden" name="transactionId" value={row.id} />

                        <div className="grid gap-2 md:grid-cols-5">
                          <input type="date" name="bookingDate" defaultValue={row.bookingDate} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                          <input name="effectiveMonthKey" defaultValue={row.effectiveMonthKey} pattern="^\d{4}-(0[1-9]|1[0-2])$" className="rounded border border-slate-300 px-2 py-1 text-xs" />
                          <select name="transactionType" defaultValue={row.transactionType} className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="expense">Ausgabe</option>
                            <option value="income">Einkommen</option>
                            <option value="refund">Sonstige Einnahme</option>
                            <option value="transfer">Transfer</option>
                          </select>
                          <input name="amount" defaultValue={toAmountInput(row.amountCents)} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                          <select name="accountId" defaultValue={String(accountOptions.find((a) => a.name === row.accountName)?.id ?? "")} className="rounded border border-slate-300 px-2 py-1 text-xs">
                            {accountOptions.map((account) => (
                              <option key={account.id} value={account.id}>{account.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-2 md:grid-cols-4">
                          <select name="destinationAccountId" defaultValue={String(accountOptions.find((a) => a.name === row.destinationAccountName)?.id ?? "")} className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="">-</option>
                            {accountOptions.map((account) => (
                              <option key={account.id} value={account.id}>{account.name}</option>
                            ))}
                          </select>
                          <select name="categoryId" defaultValue={String(categoryOptions.find((c) => c.name === row.categoryName)?.id ?? "")} className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="">-</option>
                            {categoryOptions.map((category) => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                          <select name="specialBudgetId" defaultValue={String(rowSpecialBudgets.find((b) => b.name === row.specialBudgetName)?.id ?? "")} className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="">-</option>
                            {rowSpecialBudgets.map((budget) => (
                              <option key={budget.id} value={budget.id}>{budget.name}</option>
                            ))}
                          </select>
                          <input name="description" defaultValue={row.description} className="rounded border border-slate-300 px-2 py-1 text-xs" maxLength={140} />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button type="submit" name="intent" value="save" className="rounded border border-sky-300 bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
                            Speichern
                          </button>
                          <button type="submit" name="intent" value="delete" className="rounded border border-red-300 bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                            Löschen
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Importierte Buchungen
            </p>
            <h3 className="text-base font-semibold text-slate-900">
              Ergebnisse aus bestätigten Importläufen
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
              Importierte Buchungen: {importedTransactions.length}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
              Offene Zuordnung (Ausgaben): {importedOpenAssignments}
            </span>
          </div>
        </header>

        <div className="transaction-fallback-table-card overflow-x-auto rounded-lg border border-slate-200">
          <table className="transaction-fallback-table min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Datum</th>
                <th className="px-3 py-2 font-semibold">Buchung</th>
                <th className="px-3 py-2 font-semibold">Gegenpartei</th>
                <th className="px-3 py-2 font-semibold">Betrag</th>
                <th className="px-3 py-2 font-semibold">Zuordnung</th>
                <th className="px-3 py-2 font-semibold">Importlauf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importedNonTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-slate-600">
                    Noch keine importierten Ausgaben/Einnahmen vorhanden.
                  </td>
                </tr>
              ) : (
                importedNonTransfers.map((row) => {
                  const assignment =
                    row.transactionType === "expense"
                      ? row.categoryName ?? row.specialBudgetName ?? "Zuordnen"
                      : "Keine Zuordnung nötig";

                  return (
                    <tr key={`imported-main-${row.id}`}>
                      <td data-label="Datum" className="px-3 py-2">{row.bookingDate}</td>
                      <td data-label="Buchung" className="px-3 py-2 font-medium text-slate-900" title={row.description}>
                        {row.displayName}
                      </td>
                      <td data-label="Gegenpartei" className="px-3 py-2 text-slate-700">{row.counterpartyName ?? "-"}</td>
                      <td data-label="Betrag" className="px-3 py-2 text-slate-900">{formatEuro(row.amountCents)}</td>
                      <td data-label="Zuordnung" className="px-3 py-2">
                        {assignment === "Zuordnen" ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Zuordnen
                          </span>
                        ) : (
                          <span className="text-slate-700">{assignment}</span>
                        )}
                      </td>
                      <td data-label="Importlauf" className="px-3 py-2 text-slate-600">#{row.importRunId ?? "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="transaction-fallback-table-card overflow-x-auto rounded-lg border border-slate-200">
          <table className="transaction-fallback-table min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 font-semibold">Datum</th>
                <th className="px-3 py-2 font-semibold">Transfer</th>
                <th className="px-3 py-2 font-semibold">Strecke</th>
                <th className="px-3 py-2 font-semibold">Betrag</th>
                <th className="px-3 py-2 font-semibold">Importlauf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-600">
                    Keine importierten Transfers vorhanden.
                  </td>
                </tr>
              ) : (
                importedTransfers.map((row) => (
                  <tr key={`imported-transfer-${row.id}`}>
                    <td data-label="Datum" className="px-3 py-2">{row.bookingDate}</td>
                    <td data-label="Transfer" className="px-3 py-2 font-medium text-slate-900" title={row.description}>
                      {row.displayName}
                    </td>
                    <td data-label="Strecke" className="px-3 py-2 text-slate-700">
                      {row.sourceAccountName}
                      {" -> "}
                      {row.destinationAccountName ?? "(ohne Zielkonto)"}
                    </td>
                    <td data-label="Betrag" className="px-3 py-2 text-slate-900">{formatEuro(row.amountCents)}</td>
                    <td data-label="Importlauf" className="px-3 py-2 text-slate-600">#{row.importRunId ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
