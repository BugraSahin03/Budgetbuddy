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

function mapTodoRow(row: {
  id: number;
  monthKey: string;
  text: string;
  isDone: number;
}): MonthTodoItem {
  return {
    id: row.id,
    monthKey: row.monthKey,
    text: row.text,
    isDone: mapSqliteBoolean(row.isDone),
  };
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

function parseTodoId(todoId: number | string): number {
  const id = Number.parseInt(String(todoId), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ToDo-ID ist ungültig.");
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

  return rows.map(mapTodoRow);
}

export function createMonthlyTodo(monthKey: string, text: string): MonthTodoItem {
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const normalizedText = normalizeTodoText(text);

  const result = getDb()
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

  return getMonthlyTodo(result.lastInsertRowid, normalizedMonthKey);
}

export function getMonthlyTodo(todoId: number | bigint | string, monthKey: string): MonthTodoItem {
  const id = parseTodoId(String(todoId));
  const normalizedMonthKey = normalizeMonthKey(monthKey);
  const row = getDb()
    .prepare(
      `
        SELECT
          id,
          month_key AS monthKey,
          text,
          is_done AS isDone
        FROM monthly_todos
        WHERE id = ?
          AND month_key = ?
      `,
    )
    .get(id, normalizedMonthKey) as
    | {
        id: number;
        monthKey: string;
        text: string;
        isDone: number;
      }
    | undefined;

  if (!row) {
    throw new Error("ToDo wurde für diesen Monat nicht gefunden.");
  }

  return mapTodoRow(row);
}

export function toggleMonthlyTodo(todoId: number | string, monthKey: string): MonthTodoItem {
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
    throw new Error("ToDo wurde für diesen Monat nicht gefunden.");
  }

  return getMonthlyTodo(id, normalizedMonthKey);
}
