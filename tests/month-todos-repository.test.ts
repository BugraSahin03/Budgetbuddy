import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

vi.mock("server-only", () => ({}), { virtual: true });

let db: Database.Database;

vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const {
  createMonthlyTodo,
  listMonthlyTodos,
  toggleMonthlyTodo,
} = await import("@/src/month-todos/repository");

describe("month todos repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("stores todos per month and keeps other months separate", () => {
    createMonthlyTodo("2033-06", "Stromanbieter pruefen");
    createMonthlyTodo("2033-06", "Bargeld pruefen");
    createMonthlyTodo("2033-07", "Versicherung ueberweisen");

    expect(listMonthlyTodos("2033-06").map((todo) => todo.text)).toEqual([
      "Stromanbieter pruefen",
      "Bargeld pruefen",
    ]);
    expect(listMonthlyTodos("2033-07").map((todo) => todo.text)).toEqual([
      "Versicherung ueberweisen",
    ]);
  });

  it("toggles a todo between open and done inside its month", () => {
    createMonthlyTodo("2033-06", "Rechnung pruefen");

    const [todo] = listMonthlyTodos("2033-06");
    expect(todo.isDone).toBe(false);

    toggleMonthlyTodo(todo.id, "2033-06");
    expect(listMonthlyTodos("2033-06")[0].isDone).toBe(true);

    toggleMonthlyTodo(todo.id, "2033-06");
    expect(listMonthlyTodos("2033-06")[0].isDone).toBe(false);
  });

  it("does not toggle a todo through another month", () => {
    createMonthlyTodo("2033-06", "Nur Juni");

    const [todo] = listMonthlyTodos("2033-06");

    expect(() => toggleMonthlyTodo(todo.id, "2033-07")).toThrow(
      "ToDo wurde fuer diesen Monat nicht gefunden.",
    );
    expect(listMonthlyTodos("2033-06")[0].isDone).toBe(false);
  });
});
