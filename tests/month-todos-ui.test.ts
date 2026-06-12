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
    const actions = readProjectFile("app/monate/actions.ts");
    const css = readProjectFile("app/globals.css");

    expect(page).toContain("listMonthlyTodos(month.monthKey)");
    expect(page).toContain("ToDos");
    expect(page).toContain("month-todo-dialog");
    expect(page).toContain("month-todo-list");
    expect(page).toContain("month-todo-toggle");
    expect(page).toContain("todo.isDone ? \"●\" : \"○\"");
    expect(page).toContain("month-todo-number");
    expect(page).toContain("todoDialog");
    expect(page).toContain("initialOpen={shouldOpenTodoDialog}");
    expect(page).toContain("createMonthlyTodoAction");
    expect(page).toContain("toggleMonthlyTodoAction");
    expect(actions).toContain("createMonthlyTodo(");
    expect(actions).toContain("toggleMonthlyTodo(");
    expect(css).toContain(".month-todo-row.is-done p");
    expect(css).toContain("text-decoration: line-through");
  });

  it("keeps the todo dialog open after create or toggle redirects", () => {
    const actions = readProjectFile("app/monate/actions.ts");
    const dialog = readProjectFile("app/monate/month-dialog.tsx");

    expect(actions).toContain("let redirectTarget");
    expect(actions).toContain("todoDialog=1&notice");
    expect(actions).toContain("todoDialog=1&error");
    expect(actions).toContain("redirect(redirectTarget)");
    expect(dialog).toContain("initialOpen");
    expect(dialog).toContain("dialog.showModal()");
  });

  it("keeps first-slice todo scope intentionally narrow", () => {
    const page = readProjectFile("app/monate/[monthKey]/page.tsx");
    const repository = readProjectFile("src/month-todos/repository.ts");
    const domainModel = readProjectFile("docs/domain-model.md");

    expect(repository).toContain("WHERE month_key = ?");
    expect(repository).toContain("ORDER BY id ASC");
    expect(repository).not.toContain("due");
    expect(repository).not.toContain("priority");
    expect(page).not.toContain("Faellig");
    expect(page).not.toContain("Prioritaet");
    expect(domainModel).toContain("ToDos werden nicht automatisch in Folgemonate uebernommen");
  });
});
