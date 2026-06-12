import "server-only";

import { getDb } from "@/src/db/client";
import { normalizeMonthKey } from "@/src/months/repository";

export type MonthTodoItem = {
  id: number;
  monthKey: string;
  text: string;
  isDone: boolean;
};

const TODO_TEXT_MAX_LENGTH = 180;

function mapSqliteBoolean(value: number): boolean {
  return value === 1;
}

function normalizeTodoText(text: string): string {
  const normalized = text.trim();

  if (normalized.length === 0) {
    throw new Error("ToDo-Text ist erforderlich.");
  }

  if (normalized.length > TODO_TEXT_MAX_LENGTH) {
    throw new Error(`ToDo-Text darf maximal ${TODO_TEXT_MAX_LENGTH} Zeichen enthalten.`);
  }

  return normalized;
}

function parseTodoId(todoId: number): number {
  const id = Number.parseInt(String(todoId), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ToDo-ID ist ungueltig.");
  }

  return id;
}

export function listMonthlyTodos(monthKey: string): MonthTodoItem[] {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const rows = getDb()
    .prepare(
      `
        SELECT
          id,
          month_key AS monthKey,
          text,
          is_done AS isDone
        FROM monthly_todos
        WHERE month_key = ?
        ORDER BY id ASC
      `,
    )
    .all(normalizedMonthKey) as Array<{
    id: number;
    monthKey: string;
    text: string;
    isDone: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    monthKey: row.monthKey,
    text: row.text,
    isDone: mapSqliteBoolean(row.isDone),
  }));
}

export function createMonthlyTodo(monthKey: string, text: string): void {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedText = normalizeTodoText(text);

  getDb()
    .prepare(
      `
        INSERT INTO monthly_todos (
          month_key,
          text,
          is_done,
          updated_at
        )
        VALUES (?, ?, 0, CURRENT_TIMESTAMP)
      `,
    )
    .run(normalizedMonthKey, normalizedText);
}

export function toggleMonthlyTodo(todoId: number, monthKey: string): void {
  const id = parseTodoId(todoId);
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const result = getDb()
    .prepare(
      `
        UPDATE monthly_todos
        SET
          is_done = CASE is_done WHEN 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND month_key = ?
      `,
    )
    .run(id, normalizedMonthKey);

  if (result.changes === 0) {
    throw new Error("ToDo wurde fuer diesen Monat nicht gefunden.");
  }
}
