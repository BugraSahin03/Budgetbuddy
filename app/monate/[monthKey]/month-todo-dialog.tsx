"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";

import { MonthDialog } from "@/app/monate/month-dialog";
import type { MonthTodoItem } from "@/src/month-todos/repository";

type MonthTodoDialogProps = {
  monthKey: string;
  monthLabel: string;
  initialTodos: MonthTodoItem[];
};

type TodoResponse = {
  todo?: MonthTodoItem;
  error?: string;
};

export function MonthTodoDialog({
  monthKey,
  monthLabel,
  initialTodos,
}: MonthTodoDialogProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const openTodoCount = useMemo(
    () => todos.filter((todo) => !todo.isDone).length,
    [todos],
  );

  async function readTodoResponse(response: Response): Promise<MonthTodoItem> {
    const body = (await response.json()) as TodoResponse;

    if (!response.ok || !body.todo) {
      throw new Error(body.error ?? "ToDo konnte nicht gespeichert werden.");
    }

    return body.todo;
  }

  function createTodo(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const todoText = String(formData.get("text") ?? "");

    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch(`/monate/${monthKey}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: todoText }),
        });
        const todo = await readTodoResponse(response);

        setTodos((currentTodos) => [...currentTodos, todo]);
        setText("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "ToDo konnte nicht gespeichert werden.",
        );
      }
    });
  }

  function toggleTodo(todoId: number): void {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch(`/monate/${monthKey}/todos/${todoId}`, {
          method: "PATCH",
        });
        const todo = await readTodoResponse(response);

        setTodos((currentTodos) =>
          currentTodos.map((currentTodo) =>
            currentTodo.id === todo.id ? todo : currentTodo,
          ),
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "ToDo konnte nicht aktualisiert werden.",
        );
      }
    });
  }

  return (
    <MonthDialog
      eyebrow="Monats-ToDos"
      title={`ToDos ${monthLabel}`}
      triggerLabel="ToDos"
      triggerClassName="month-dialog-trigger month-dialog-trigger-subtle"
    >
      <section className="month-todo-dialog" aria-busy={isPending}>
        <div className="month-todo-summary">
          <span>{todos.length} Aufgaben</span>
          <strong>{openTodoCount} offen</strong>
        </div>

        {error ? <p className="month-todo-error">{error}</p> : null}

        <div className="month-todo-list" aria-label={`ToDos für ${monthLabel}`}>
          {todos.length === 0 ? (
            <p className="month-todo-empty">
              Noch keine ToDos für diesen Monat. Kleine Aufgaben kannst du unten direkt anlegen.
            </p>
          ) : (
            todos.map((todo, index) => (
              <article
                key={todo.id}
                className={`month-todo-row ${todo.isDone ? "is-done" : ""}`}
              >
                <button
                  type="button"
                  className="month-todo-toggle"
                  disabled={isPending}
                  onClick={() => toggleTodo(todo.id)}
                  aria-label={
                    todo.isDone
                      ? `ToDo ${index + 1} wieder öffnen`
                      : `ToDo ${index + 1} erledigen`
                  }
                >
                  <span aria-hidden="true">{todo.isDone ? "●" : "○"}</span>
                </button>
                <p>
                  <span className="month-todo-number">{index + 1}.</span>
                  <span>{todo.text}</span>
                </p>
              </article>
            ))
          )}
        </div>

        <form onSubmit={createTodo} className="month-todo-form">
          <label>
            <span>Neues ToDo</span>
            <input
              name="text"
              required
              maxLength={180}
              placeholder="z. B. Rechnung prüfen"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button type="submit" disabled={isPending}>
            Hinzufügen
          </button>
        </form>
      </section>
    </MonthDialog>
  );
}
