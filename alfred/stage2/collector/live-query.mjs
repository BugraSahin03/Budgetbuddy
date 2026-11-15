import {
  buildFixedCostControlMatches, hasBudgetEffectiveEntries,
  readFixedCostControlOverrides, readPersistedFixedCostControlMatches,
  readSchemaVersion, readTransactionRows,
} from "./collector.mjs";

const month = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;
const date = /^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const types = ["expense", "income", "refund", "transfer", "income_deduction"];
const keys = {
  summary: ["fromMonth", "toMonth", "throughDay", "categoryId"],
  transactions: ["fromMonth", "toMonth", "fromDate", "toDate", "type", "categoryId",
    "unassigned", "minAbsCents", "maxAbsCents", "text", "offset", "limit"],
  settlements: ["fromMonth", "toMonth", "settlementId", "offset", "limit"],
};

function validate(q) {
  if (!q || typeof q !== "object" || !Object.hasOwn(keys, q.view) ||
      Object.keys(q).some((k) => k !== "view" && !keys[q.view].includes(k))) {
    throw new Error("Invalid query fields or view");
  }
  const { fromMonth, toMonth } = q;
  if (![fromMonth, toMonth].every((m) => typeof m === "string" && month.test(m))) {
    throw new Error("Use YYYY-MM for both months");
  }
  const ordinal = (m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5));
  const span = ordinal(toMonth) - ordinal(fromMonth);
  if (span < 0 || span > (q.view === "summary" ? 12 : 2)) throw new Error("Invalid month span");
  for (const [key, min, max] of [
    ["throughDay", 1, 31], ["categoryId", 1, Number.MAX_SAFE_INTEGER],
    ["minAbsCents", 0, Number.MAX_SAFE_INTEGER], ["maxAbsCents", 0, Number.MAX_SAFE_INTEGER],
    ["settlementId", 1, Number.MAX_SAFE_INTEGER], ["limit", 1, 25], ["offset", 0, 10000],
  ]) {
    if (Object.hasOwn(q, key) && (!Number.isSafeInteger(q[key]) || q[key] < min || q[key] > max)) {
      throw new Error(`Invalid ${key}`);
    }
  }
  for (const key of ["fromDate", "toDate"]) {
    if (Object.hasOwn(q, key) && (typeof q[key] !== "string" || !date.test(q[key]) ||
      new Date(q[key]).toISOString().slice(0, 10) !== q[key])) throw new Error(`Invalid ${key}`);
  }
  if ((q.fromDate && q.toDate && q.fromDate > q.toDate) ||
      (q.minAbsCents != null && q.maxAbsCents != null && q.minAbsCents > q.maxAbsCents) ||
      (Object.hasOwn(q, "text") && (typeof q.text !== "string" || q.text.length > 100 || !q.text.trim())) ||
      (Object.hasOwn(q, "unassigned") && typeof q.unassigned !== "boolean") ||
      (Object.hasOwn(q, "type") && !types.includes(q.type))) throw new Error("Invalid filters");
  return span;
}

const paginate = (rows, offset, limit) => ({
  rows: rows.slice(0, limit), nextOffset: rows.length > limit ? offset + limit : null,
});

export function queryBudgetBuddy(db, q, now = new Date()) {
  const span = validate(q);
  const { fromMonth, toMonth, offset = 0, limit = 15 } = q;
  return db.transaction(() => {
    const schemaVersion = readSchemaVersion(db);
    const settlements = hasBudgetEffectiveEntries(db);
    const base = {
      status: "ok", source: "BudgetBuddy live SQLite (read-only)",
      queriedAt: now.toISOString(), schemaVersion,
    };
    if (q.view === "summary") {
      const rows = readTransactionRows(db, fromMonth, toMonth);
      const controls = buildFixedCostControlMatches(rows,
        readPersistedFixedCostControlMatches(db, fromMonth, toMonth),
        readFixedCostControlOverrides(db, fromMonth, toMonth));
      const today = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(now);
      const data = Array.from({ length: span + 1 }, (_, i) => {
        const m = new Date(Date.UTC(+fromMonth.slice(0, 4), +fromMonth.slice(5) - 1 + i, 1))
          .toISOString().slice(0, 7);
        const byCurrency = new Map();
        for (const r of rows) {
          if (r.monthKey !== m || (q.categoryId != null && r.categoryId !== q.categoryId) ||
              (q.throughDay != null && (r.bookingDate?.slice(0, 7) !== m ||
                Number(r.bookingDate.slice(8, 10)) > q.throughDay || r.bookingDate > today))) continue;
          const t = byCurrency.get(r.currencyCode) ?? {
            currency: r.currencyCode, totalExpenseCents: 0, fixedCostControlCents: 0,
            savingsCents: 0, consumerExpenseCents: 0, refundCents: 0, entryCount: 0,
          };
          t.entryCount++;
          if (r.transactionType === "expense") {
            const amount = -r.amountCents;
            t.totalExpenseCents += amount;
            if (controls.has(r.id)) t.fixedCostControlCents += amount;
            else if (r.categorySystemKey === "savings") t.savingsCents += amount;
            else t.consumerExpenseCents += amount;
          } else if (r.transactionType === "refund") t.refundCents += r.amountCents;
          byCurrency.set(r.currencyCode, t);
        }
        return { month: m, throughDay: q.throughDay ?? null,
          cutoffReached: q.throughDay == null ? null : m < today.slice(0, 7) ||
            (m === today.slice(0, 7) && Number(today.slice(8)) >= q.throughDay),
          amountsByCurrency: [...byCurrency.values()] };
      });
      return { ...base, data, basis: q.throughDay == null
        ? "Budget month assignment; date of booking can differ. Refunds shown separately."
        : "Budget month assignment AND booking date in that calendar month from day 1 through cutoff, excluding future dates. Finalized settlements count on their latest member booking date. Refunds shown separately." };
    }
    if (q.view === "settlements") {
      if (!settlements) return { ...base, rows: [], nextOffset: null };
      const result = db.prepare(`
        SELECT g.id AS settlementId, g.month_key AS month, g.name, g.is_finalized AS finalized,
          t.id AS transactionId, t.booking_date AS bookingDate, t.transaction_type AS type,
          t.amount_cents AS amountCents, t.currency_code AS currency,
          substr(COALESCE(t.display_name_override, t.description), 1, 100) AS label
        FROM transaction_settlement_groups g
        LEFT JOIN transaction_settlement_members m ON m.settlement_group_id = g.id
        LEFT JOIN transactions t ON t.id = m.transaction_id
        WHERE g.month_key BETWEEN @fromMonth AND @toMonth
          AND (@id IS NULL OR g.id = @id)
        ORDER BY g.month_key, g.id, t.booking_date, t.id LIMIT @limit OFFSET @offset
      `).all({ fromMonth, toMonth, id: q.settlementId ?? null, limit: limit + 1, offset });
      return { ...base, ...paginate(result, offset, limit), basis: "One row per settlement member." };
    }
    const result = db.prepare(`
      SELECT t.id, t.booking_date AS bookingDate, t.effective_month_key AS budgetMonth,
        t.transaction_type AS type, t.amount_cents AS amountCents, t.currency_code AS currency,
        t.source_type AS sourceType, t.account_id AS accountId, t.category_id AS categoryId,
        c.name AS category, t.special_budget_id AS specialBudgetId, b.name AS specialBudget,
        substr(COALESCE(t.display_name_override, t.description), 1, 100) AS label,
        ${settlements ? "g.id" : "NULL"} AS settlementId,
        ${settlements ? "g.is_finalized" : "NULL"} AS settlementFinalized,
        CASE WHEN o.mode = 'exclude' THEN 0
          WHEN o.mode = 'include' OR f.transaction_id IS NOT NULL THEN 1 ELSE 0 END AS fixedCostControl
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN special_budgets b ON b.id = t.special_budget_id
      LEFT JOIN transaction_fixed_cost_control_matches f ON f.transaction_id = t.id
      LEFT JOIN transaction_fixed_cost_control_overrides o ON o.transaction_id = t.id
      ${settlements ? "LEFT JOIN transaction_settlement_members m ON m.transaction_id = t.id LEFT JOIN transaction_settlement_groups g ON g.id = m.settlement_group_id" : ""}
      WHERE t.effective_month_key BETWEEN @fromMonth AND @toMonth
        AND (@fromDate IS NULL OR t.booking_date >= @fromDate)
        AND (@toDate IS NULL OR t.booking_date <= @toDate)
        AND (@type IS NULL OR t.transaction_type = @type)
        AND (@categoryId IS NULL OR t.category_id = @categoryId)
        AND (@unassigned IS NULL OR (t.category_id IS NULL AND t.special_budget_id IS NULL) = @unassigned)
        AND (@min IS NULL OR abs(t.amount_cents) >= @min)
        AND (@max IS NULL OR abs(t.amount_cents) <= @max)
        AND (@text IS NULL OR instr(lower(COALESCE(t.display_name_override, t.description)), lower(@text)) > 0)
      ORDER BY t.booking_date, t.id LIMIT @limit OFFSET @offset
    `).all({ fromMonth, toMonth, fromDate: q.fromDate ?? null, toDate: q.toDate ?? null,
      type: q.type ?? null, categoryId: q.categoryId ?? null,
      unassigned: q.unassigned == null ? null : Number(q.unassigned),
      min: q.minAbsCents ?? null, max: q.maxAbsCents ?? null, text: q.text?.trim() ?? null,
      limit: limit + 1, offset });
    return { ...base, ...paginate(result, offset, limit),
      basis: "Raw bookings, including settlement members. Do not sum these as effective budget totals." };
  }).deferred();
}
