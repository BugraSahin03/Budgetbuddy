import "server-only";

import { getDb } from "@/src/db/client";

export type SpecialBudgetProjectStatus = "active" | "archived";

export type SpecialBudgetListItem = {
  id: number;
  projectId: number | null;
  projectStatus: SpecialBudgetProjectStatus;
  projectMonthCount: number;
  projectPlannedAmountCents: number;
  projectActualExpenseCents: number;
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  note: string | null;
  isActive: boolean;
  actualExpenseCents: number;
};

export type SpecialBudgetArchiveItem = {
  projectId: number;
  name: string;
  status: SpecialBudgetProjectStatus;
  note: string | null;
  firstMonthKey: string | null;
  lastMonthKey: string | null;
  monthCount: number;
  plannedAmountCents: number;
  actualExpenseCents: number;
};

export type SpecialBudgetInput = {
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  note: string;
};

export type ActiveSpecialBudgetOption = {
  id: number;
  name: string;
  monthKey: string;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function normalizeName(name: string): string {
  const normalized = name.trim();

  if (normalized.length < 2) {
    throw new Error("Name muss mindestens 2 Zeichen enthalten.");
  }

  if (normalized.length > 80) {
    throw new Error("Name darf maximal 80 Zeichen enthalten.");
  }

  return normalized;
}

function normalizeMonthKey(monthKey: string): string {
  const normalized = monthKey.trim();

  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error("Monat muss im Format JJJJ-MM vorliegen.");
  }

  return normalized;
}

function assertSpecialBudgetBelongsToMonth(
  specialBudgetId: number,
  monthKey: string,
): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const row = getDb()
    .prepare(
      `
        SELECT id
        FROM special_budgets
        WHERE id = ?
          AND month_key = ?
        LIMIT 1
      `,
    )
    .get(specialBudgetId, normalizedMonthKey) as { id: number } | undefined;

  if (!row) {
    throw new Error("Sonderbudget passt nicht zum ausgewaehlten Monat.");
  }
}

function normalizePlannedAmountCents(plannedAmountCents: number): number {
  if (!Number.isInteger(plannedAmountCents) || plannedAmountCents < 0) {
    throw new Error("Geplanter Betrag muss 0 oder groesser sein.");
  }

  return plannedAmountCents;
}

function normalizeNote(note: string): string | null {
  const normalized = note.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 240) {
    throw new Error("Notiz darf maximal 240 Zeichen enthalten.");
  }

  return normalized;
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getSelectableMonthKeys(baseDate: Date = new Date()): string[] {
  const months: string[] = [];
  const cursor = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

  for (let index = 0; index < 12; index += 1) {
    months.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function mapSpecialBudgetPersistenceError(error: unknown): Error {
  if (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed: special_budgets.name, special_budgets.month_key")
  ) {
    return new Error("Dieses Sonderbudget existiert im gewaehlten Monat bereits.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Sonderbudget konnte nicht gespeichert werden.");
}

function ensureProjectForName(name: string, note: string | null): number {
  getDb()
    .prepare(
      `
        INSERT INTO special_budget_projects (
          name,
          status,
          note,
          updated_at
        )
        VALUES (?, 'active', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(name) DO UPDATE SET
          status = 'active',
          note = COALESCE(excluded.note, special_budget_projects.note),
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .run(name, note);

  const project = getDb()
    .prepare(
      `
        SELECT id
        FROM special_budget_projects
        WHERE name = ?
        LIMIT 1
      `,
    )
    .get(name) as { id: number } | undefined;

  if (!project) {
    throw new Error("Sonderbudget-Vorhaben konnte nicht vorbereitet werden.");
  }

  return project.id;
}

function updateProjectStatusFromMonthlyShares(projectId: number): void {
  const row = getDb()
    .prepare(
      `
        SELECT COUNT(*) AS activeShareCount
        FROM special_budgets
        WHERE project_id = ?
          AND is_active = 1
      `,
    )
    .get(projectId) as { activeShareCount: number };

  getDb()
    .prepare(
      `
        UPDATE special_budget_projects
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(row.activeShareCount > 0 ? "active" : "archived", projectId);
}

export function listSpecialBudgets(): SpecialBudgetListItem[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          sb.id,
          sb.project_id AS projectId,
          COALESCE(sbp.status, 'active') AS projectStatus,
          (
            SELECT COUNT(*)
            FROM special_budgets grouped_sb
            WHERE grouped_sb.project_id = sb.project_id
          ) AS projectMonthCount,
          (
            SELECT COALESCE(SUM(grouped_sb.planned_amount_cents), 0)
            FROM special_budgets grouped_sb
            WHERE grouped_sb.project_id = sb.project_id
          ) AS projectPlannedAmountCents,
          (
            SELECT COALESCE(SUM(-t.amount_cents), 0)
            FROM transactions t
            INNER JOIN special_budgets grouped_sb ON grouped_sb.id = t.special_budget_id
            WHERE grouped_sb.project_id = sb.project_id
              AND t.transaction_type = 'expense'
          ) AS projectActualExpenseCents,
          sb.name,
          sb.month_key AS monthKey,
          sb.planned_amount_cents AS plannedAmountCents,
          sb.note,
          sb.is_active AS isActive,
          COALESCE(
            (
              SELECT ABS(SUM(t.amount_cents))
              FROM transactions t
              WHERE t.special_budget_id = sb.id
                AND t.transaction_type = 'expense'
            ),
            0
          ) AS actualExpenseCents
        FROM special_budgets sb
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        ORDER BY sb.month_key ASC, sb.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{
    id: number;
    projectId: number | null;
    projectStatus: SpecialBudgetProjectStatus;
    projectMonthCount: number | null;
    projectPlannedAmountCents: number | null;
    projectActualExpenseCents: number | null;
    name: string;
    monthKey: string;
    plannedAmountCents: number;
    note: string | null;
    isActive: number;
    actualExpenseCents: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectStatus: row.projectStatus,
    projectMonthCount: row.projectMonthCount ?? 1,
    projectPlannedAmountCents: row.projectPlannedAmountCents ?? row.plannedAmountCents,
    projectActualExpenseCents: row.projectActualExpenseCents ?? row.actualExpenseCents,
    name: row.name,
    monthKey: row.monthKey,
    plannedAmountCents: row.plannedAmountCents,
    note: row.note,
    isActive: mapSqliteBoolean(row.isActive) && row.projectStatus === "active",
    actualExpenseCents: row.actualExpenseCents,
  }));
}

export function listArchivedSpecialBudgetProjects(): SpecialBudgetArchiveItem[] {
  const rows = getDb()
    .prepare(
      `
        SELECT
          sbp.id AS projectId,
          sbp.name,
          sbp.status,
          sbp.note,
          MIN(sb.month_key) AS firstMonthKey,
          MAX(sb.month_key) AS lastMonthKey,
          COUNT(sb.id) AS monthCount,
          COALESCE(SUM(sb.planned_amount_cents), 0) AS plannedAmountCents,
          COALESCE(
            SUM(
              (
                SELECT COALESCE(SUM(-t.amount_cents), 0)
                FROM transactions t
                WHERE t.special_budget_id = sb.id
                  AND t.transaction_type = 'expense'
              )
            ),
            0
          ) AS actualExpenseCents
        FROM special_budget_projects sbp
        LEFT JOIN special_budgets sb ON sb.project_id = sbp.id
        WHERE sbp.status = 'archived'
        GROUP BY sbp.id, sbp.name, sbp.status, sbp.note
        ORDER BY lastMonthKey DESC, sbp.name COLLATE NOCASE ASC
      `,
    )
    .all() as SpecialBudgetArchiveItem[];

  return rows;
}

export function createSpecialBudget(input: SpecialBudgetInput): void {
  const name = normalizeName(input.name);
  const monthKey = normalizeMonthKey(input.monthKey);
  const plannedAmountCents = normalizePlannedAmountCents(input.plannedAmountCents);
  const note = normalizeNote(input.note);

  try {
    const transaction = getDb().transaction(() => {
      const projectId = ensureProjectForName(name, note);

      getDb()
        .prepare(
          `
            INSERT INTO special_budgets (
              project_id,
              name,
              month_key,
              planned_amount_cents,
              note,
              is_active,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          `,
        )
        .run(projectId, name, monthKey, plannedAmountCents, note);
    });

    transaction();
  } catch (error) {
    throw mapSpecialBudgetPersistenceError(error);
  }
}

export function setSpecialBudgetActive(specialBudgetId: number, isActive: boolean): void {
  const existing = getDb()
    .prepare(
      `
        SELECT project_id AS projectId
        FROM special_budgets
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(specialBudgetId) as { projectId: number | null } | undefined;

  if (!existing) {
    throw new Error("Sonderbudget wurde nicht gefunden.");
  }

  const transaction = getDb().transaction(() => {
    const result = getDb()
      .prepare(
        `
          UPDATE special_budgets
          SET
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(isActive ? 1 : 0, specialBudgetId);

    if (result.changes === 0) {
      throw new Error("Sonderbudget wurde nicht gefunden.");
    }

    if (existing.projectId) {
      if (isActive) {
        getDb()
          .prepare(
            `
              UPDATE special_budget_projects
              SET
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
          )
          .run(existing.projectId);
      } else {
        updateProjectStatusFromMonthlyShares(existing.projectId);
      }
    }
  });

  transaction();
}

export function reactivateSpecialBudgetProject(projectId: number): void {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Sonderbudget-Vorhaben ist ungueltig.");
  }

  const project = getDb()
    .prepare(
      `
        SELECT id
        FROM special_budget_projects
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(projectId) as { id: number } | undefined;

  if (!project) {
    throw new Error("Sonderbudget-Vorhaben wurde nicht gefunden.");
  }

  const transaction = getDb().transaction(() => {
    getDb()
      .prepare(
        `
          UPDATE special_budget_projects
          SET
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(projectId);

    getDb()
      .prepare(
        `
          UPDATE special_budgets
          SET
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (
            SELECT id
            FROM special_budgets
            WHERE project_id = ?
            ORDER BY month_key DESC, id DESC
            LIMIT 1
          )
        `,
      )
      .run(projectId);
  });

  transaction();
}

export function updateSpecialBudgetPlannedAmount(
  specialBudgetId: number,
  plannedAmountCents: number,
): void {
  const normalizedPlannedAmountCents = normalizePlannedAmountCents(plannedAmountCents);

  const result = getDb()
    .prepare(
      `
        UPDATE special_budgets
        SET
          planned_amount_cents = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(normalizedPlannedAmountCents, specialBudgetId);

  if (result.changes === 0) {
    throw new Error("Sonderbudget wurde nicht gefunden.");
  }
}

export function updateSpecialBudgetPlannedAmountForMonth(
  specialBudgetId: number,
  monthKey: string,
  plannedAmountCents: number,
): void {
  assertSpecialBudgetBelongsToMonth(specialBudgetId, monthKey);
  updateSpecialBudgetPlannedAmount(specialBudgetId, plannedAmountCents);
}

export function setSpecialBudgetActiveForMonth(
  specialBudgetId: number,
  monthKey: string,
  isActive: boolean,
): void {
  assertSpecialBudgetBelongsToMonth(specialBudgetId, monthKey);
  setSpecialBudgetActive(specialBudgetId, isActive);
}

export function listActiveSpecialBudgetOptions(monthKey: string): ActiveSpecialBudgetOption[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);

  const rows = getDb()
    .prepare(
      `
        SELECT
          sb.id,
          sb.name,
          sb.month_key AS monthKey
        FROM special_budgets sb
        LEFT JOIN special_budget_projects sbp ON sbp.id = sb.project_id
        WHERE sb.is_active = 1
          AND COALESCE(sbp.status, 'active') = 'active'
          AND sb.month_key = ?
        ORDER BY sb.name COLLATE NOCASE ASC
      `,
    )
    .all(normalizedMonthKey) as ActiveSpecialBudgetOption[];

  return rows;
}
