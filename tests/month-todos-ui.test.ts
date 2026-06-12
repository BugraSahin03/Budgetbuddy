import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("FIN-082 month todos UI", () => {
  it("adds a simple month todo dialog to the month detail page", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const dialog = readProjectFile("app/monate/[monthKey]/month-todo-dialog.tsx");
    const css = readProjectFile("app/globals.css");

    expect(page).toContain("listMonthlyTodos(month.monthKey)");
    expect(page).toContain("MonthTodoDialog");
    expect(dialog).toContain("ToDos");
    expect(dialog).toContain("month-todo-dialog");
    expect(dialog).toContain("month-todo-list");
    expect(dialog).toContain("month-todo-toggle");
    expect(dialog).toContain("todo.isDone ? \"●\" : \"○\"");
    expect(dialog).toContain("month-todo-number");
    expect(dialog).toContain("fetch(`/monate/${monthKey}/todos`");
    expect(dialog).toContain("fetch(`/monate/${monthKey}/todos/${todoId}`");
    expect(dialog).toContain("method: \"POST\"");
    expect(dialog).toContain("method: \"PATCH\"");
    expect(dialog).toContain("<form onSubmit={createTodo}");
    expect(dialog).toContain("event.preventDefault()");
    expect(dialog).not.toContain("<form action={createTodo}");
    expect(css).toContain(".month-todo-row.is-done p");
    expect(css).toContain("text-decoration: line-through");
  });

  it("keeps todo interactions inside the dialog without page redirects", () => {
    const monthActions = readProjectFile("app/monate/actions.ts");
    const dialog = readProjectFile("app/monate/[monthKey]/month-todo-dialog.tsx");
    const createRoute = readProjectFile("app/monate/[monthKey]/todos/route.ts");
    const toggleRoute = readProjectFile("app/monate/[monthKey]/todos/[todoId]/route.ts");

    expect(monthActions).not.toContain("createMonthlyTodoAction");
    expect(monthActions).not.toContain("toggleMonthlyTodoAction");
    expect(dialog).toContain("setTodos((currentTodos) => [...currentTodos, todo])");
    expect(dialog).toContain("currentTodo.id === todo.id ? todo : currentTodo");
    expect(createRoute).toContain("NextResponse.json({ todo })");
    expect(toggleRoute).toContain("NextResponse.json({ todo })");
    expect(createRoute).not.toContain("redirect(");
    expect(toggleRoute).not.toContain("redirect(");
  });

  it("keeps first-slice todo scope intentionally narrow", () => {
    const dialog = readProjectFile("app/monate/[monthKey]/month-todo-dialog.tsx");
    const repository = readProjectFile("src/month-todos/repository.ts");
    const domainModel = readProjectFile("docs/domain-model.md");

    expect(repository).toContain("WHERE month_key = ?");
    expect(repository).toContain("ORDER BY id ASC");
    expect(repository).not.toContain("due");
    expect(repository).not.toContain("priority");
    expect(dialog).not.toContain("Faellig");
    expect(dialog).not.toContain("Prioritaet");
    expect(domainModel).toContain("ToDos werden nicht automatisch in Folgemonate uebernommen");
  });
});
