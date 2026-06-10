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

export type SpecialBudgetProjectListItem = {
  projectId: number;
  name: string;
  iconName: string | null;
  note: string | null;
  monthShares: SpecialBudgetArchiveMonthShare[];
  monthCount: number;
  plannedAmountCents: number;
  actualExpenseCents: number;
};

export type SpecialBudgetArchiveItem = {
  projectId: number;
  name: string;
  iconName: string | null;
  status: SpecialBudgetProjectStatus;
  note: string | null;
  firstMonthKey: string | null;
  lastMonthKey: string | null;
  monthShares: SpecialBudgetArchiveMonthShare[];
  monthCount: number;
  plannedAmountCents: number;
  actualExpenseCents: number;
};

export type SpecialBudgetArchiveMonthShare = {
  id: number;
  monthKey: string;
  plannedAmountCents: number;
  actualExpenseCents: number;
  isActive: boolean;
};

export type SpecialBudgetInput = {
  name: string;
  monthKey: string;
  plannedAmountCents: number;
  note: string;
  iconName?: string | null;
};

export type SpecialBudgetShareInput = {
  monthKey: string;
  plannedAmountCents: number;
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

function normalizeIconName(iconName: string | null | undefined): string | null {
  const normalized = iconName?.trim() ?? "";

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 24) {
    throw new Error("Icon darf maximal 24 Zeichen enthalten.");
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

function ensureProjectForName(name: string, note: string | null, iconName: string | null): number {
  getDb()
    .prepare(
      `
        INSERT INTO special_budget_projects (
          name,
          status,
          note,
          icon_name,
          updated_at
        )
        VALUES (?, 'active', ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(name) DO UPDATE SET
          status = 'active',
          note = COALESCE(excluded.note, special_budget_projects.note),
          icon_name = COALESCE(excluded.icon_name, special_budget_projects.icon_name),
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .run(name, note, iconName);

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

function reconcileProjectStatuses(): void {
  getDb()
    .prepare(
      `
        UPDATE special_budget_projects
        SET
          status = CASE
            WHEN EXISTS (
              SELECT 1
              FROM special_budgets sb
              WHERE sb.project_id = special_budget_projects.id
                AND sb.is_active = 1
            ) THEN 'active'
            ELSE 'archived'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE EXISTS (
          SELECT 1
          FROM special_budgets sb
          WHERE sb.project_id = special_budget_projects.id
        )
      `,
    )
    .run();
}

export function ensureProjectsForUnlinkedMonthlyShares(): void {
  const rows = getDb()
    .prepare(
      `
        SELECT DISTINCT name
        FROM special_budgets
        WHERE project_id IS NULL
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{ name: string }>;

  if (rows.length === 0) {
    reconcileProjectStatuses();
    return;
  }

  const transaction = getDb().transaction((names: string[]) => {
    for (const name of names) {
      getDb()
        .prepare(
          `
            INSERT INTO special_budget_projects (
              name,
              status,
              note,
              created_at,
              updated_at
            )
            SELECT
              sb.name,
              CASE
                WHEN MAX(sb.is_active) = 1 THEN 'active'
                ELSE 'archived'
              END AS status,
              (
                SELECT inner_sb.note
                FROM special_budgets inner_sb
                WHERE inner_sb.name = sb.name
                  AND inner_sb.note IS NOT NULL
                ORDER BY inner_sb.month_key DESC, inner_sb.id DESC
                LIMIT 1
              ) AS note,
              MIN(sb.created_at) AS created_at,
              CURRENT_TIMESTAMP AS updated_at
            FROM special_budgets sb
            WHERE sb.name = ?
            GROUP BY sb.name
            ON CONFLICT(name) DO UPDATE SET
              status = excluded.status,
              note = COALESCE(excluded.note, special_budget_projects.note),
              updated_at = CURRENT_TIMESTAMP
          `,
        )
        .run(name);

      getDb()
        .prepare(
          `
            UPDATE special_budgets
            SET project_id = (
              SELECT id
              FROM special_budget_projects
              WHERE name = ?
              LIMIT 1
            )
            WHERE name = ?
              AND project_id IS NULL
          `,
        )
        .run(name, name);
    }
  });

  transaction(rows.map((row) => row.name));
  reconcileProjectStatuses();
}

export function listSpecialBudgets(): SpecialBudgetListItem[] {
  ensureProjectsForUnlinkedMonthlyShares();

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
  ensureProjectsForUnlinkedMonthlyShares();

  const rows = getDb()
    .prepare(
      `
        SELECT
          sbp.id AS projectId,
          sbp.name,
          sbp.icon_name AS iconName,
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
        GROUP BY sbp.id, sbp.name, sbp.icon_name, sbp.status, sbp.note
        ORDER BY lastMonthKey DESC, sbp.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<Omit<SpecialBudgetArchiveItem, "monthShares">>;

  return rows.map((row) => {
    const monthShares = getDb()
      .prepare(
        `
          SELECT
            sb.id,
            sb.month_key AS monthKey,
            sb.planned_amount_cents AS plannedAmountCents,
            sb.is_active AS isActive,
            COALESCE(
              (
                SELECT SUM(-t.amount_cents)
                FROM transactions t
                WHERE t.special_budget_id = sb.id
                  AND t.transaction_type = 'expense'
              ),
              0
            ) AS actualExpenseCents
          FROM special_budgets sb
          WHERE sb.project_id = ?
          ORDER BY sb.month_key ASC, sb.id ASC
        `,
      )
      .all(row.projectId) as Array<{
      id: number;
      monthKey: string;
      plannedAmountCents: number;
      actualExpenseCents: number;
      isActive: number;
    }>;

    return {
      ...row,
      monthShares: monthShares.map((share) => ({
        id: share.id,
        monthKey: share.monthKey,
        plannedAmountCents: share.plannedAmountCents,
        actualExpenseCents: share.actualExpenseCents,
        isActive: mapSqliteBoolean(share.isActive),
      })),
    };
  });
}

export function listActiveSpecialBudgetProjects(): SpecialBudgetProjectListItem[] {
  ensureProjectsForUnlinkedMonthlyShares();

  const rows = getDb()
    .prepare(
      `
        SELECT
          sbp.id AS projectId,
          sbp.name,
          sbp.icon_name AS iconName,
          sbp.note,
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
        INNER JOIN special_budgets sb ON sb.project_id = sbp.id
        WHERE sbp.status = 'active'
          AND sb.is_active = 1
        GROUP BY sbp.id, sbp.name, sbp.icon_name, sbp.note
        ORDER BY sbp.name COLLATE NOCASE ASC
      `,
    )
    .all() as Array<Omit<SpecialBudgetProjectListItem, "monthShares">>;

  return rows.map((row) => {
    const monthShares = getDb()
      .prepare(
        `
          SELECT
            sb.id,
            sb.month_key AS monthKey,
            sb.planned_amount_cents AS plannedAmountCents,
            sb.is_active AS isActive,
            COALESCE(
              (
                SELECT SUM(-t.amount_cents)
                FROM transactions t
                WHERE t.special_budget_id = sb.id
                  AND t.transaction_type = 'expense'
              ),
              0
            ) AS actualExpenseCents
          FROM special_budgets sb
          WHERE sb.project_id = ?
            AND sb.is_active = 1
          ORDER BY sb.month_key ASC, sb.id ASC
        `,
      )
      .all(row.projectId) as Array<{
      id: number;
      monthKey: string;
      plannedAmountCents: number;
      actualExpenseCents: number;
      isActive: number;
    }>;

    return {
      ...row,
      monthShares: monthShares.map((share) => ({
        id: share.id,
        monthKey: share.monthKey,
        plannedAmountCents: share.plannedAmountCents,
        actualExpenseCents: share.actualExpenseCents,
        isActive: mapSqliteBoolean(share.isActive),
      })),
    };
  });
}

export function createSpecialBudget(input: SpecialBudgetInput): void {
  createSpecialBudgetShares({
    name: input.name,
    note: input.note,
    iconName: input.iconName,
    shares: [
      {
        monthKey: input.monthKey,
        plannedAmountCents: input.plannedAmountCents,
      },
    ],
  });
}

export function createSpecialBudgetShares(input: {
  name: string;
  note: string;
  iconName?: string | null;
  shares: SpecialBudgetShareInput[];
}): void {
  const name = normalizeName(input.name);
  const note = normalizeNote(input.note);
  const iconName = normalizeIconName(input.iconName);
  const normalizedShares = input.shares.map((share) => ({
    monthKey: normalizeMonthKey(share.monthKey),
    plannedAmountCents: normalizePlannedAmountCents(share.plannedAmountCents),
  }));
  const duplicateMonthKey = normalizedShares.find(
    (share, index) =>
      normalizedShares.findIndex((candidate) => candidate.monthKey === share.monthKey) !== index,
  )?.monthKey;

  if (normalizedShares.length === 0) {
    throw new Error("Sonderbudget braucht mindestens einen Monatsanteil.");
  }

  if (duplicateMonthKey) {
    throw new Error("Ein Sonderbudget darf pro Vorhaben nur einen Anteil je Monat haben.");
  }

  try {
    const transaction = getDb().transaction(() => {
      const projectId = ensureProjectForName(name, note, iconName);

      for (const share of normalizedShares) {
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
          .run(projectId, name, share.monthKey, share.plannedAmountCents, note);
      }
    });

    transaction();
  } catch (error) {
    throw mapSpecialBudgetPersistenceError(error);
  }
}

export function updateSpecialBudgetProject(input: {
  projectId: number;
  iconName: string | null;
  shares: Array<{
    id: number;
    plannedAmountCents: number;
  }>;
}): void {
  if (!Number.isInteger(input.projectId) || input.projectId <= 0) {
    throw new Error("Sonderbudget-Vorhaben ist ungueltig.");
  }

  if (input.shares.length === 0) {
    throw new Error("Sonderbudget braucht mindestens einen Monatsanteil.");
  }

  const iconName = normalizeIconName(input.iconName);
  const normalizedShares = input.shares.map((share) => {
    if (!Number.isInteger(share.id) || share.id <= 0) {
      throw new Error("Sonderbudget-Monatsanteil ist ungueltig.");
    }

    return {
      id: share.id,
      plannedAmountCents: normalizePlannedAmountCents(share.plannedAmountCents),
    };
  });

  const transaction = getDb().transaction(() => {
    const project = getDb()
      .prepare(
        `
          SELECT id
          FROM special_budget_projects
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(input.projectId) as { id: number } | undefined;

    if (!project) {
      throw new Error("Sonderbudget-Vorhaben wurde nicht gefunden.");
    }

    getDb()
      .prepare(
        `
          UPDATE special_budget_projects
          SET
            icon_name = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(iconName, input.projectId);

    const updateShare = getDb().prepare(
      `
        UPDATE special_budgets
        SET
          planned_amount_cents = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND project_id = ?
      `,
    );

    for (const share of normalizedShares) {
      const result = updateShare.run(
        share.plannedAmountCents,
        share.id,
        input.projectId,
      );

      if (result.changes === 0) {
        throw new Error("Sonderbudget-Monatsanteil wurde nicht gefunden.");
      }
    }
  });

  transaction();
}

export function setSpecialBudgetActive(specialBudgetId: number, isActive: boolean): void {
  ensureProjectsForUnlinkedMonthlyShares();

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

export function setSpecialBudgetProjectActive(projectId: number, isActive: boolean): void {
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
          UPDATE special_budgets
          SET
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
        `,
      )
      .run(isActive ? 1 : 0, projectId);

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
      .run(isActive ? "active" : "archived", projectId);
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
