import { NextResponse } from "next/server";

import { toggleMonthlyTodo } from "@/src/month-todos/repository";

type MonthTodoToggleRouteContext = {
  params: Promise<{ monthKey: string; todoId: string }>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "ToDo konnte nicht aktualisiert werden.";
}

export async function PATCH(
  _request: Request,
  { params }: MonthTodoToggleRouteContext,
) {
  const { monthKey, todoId } = await params;

  try {
    const todo = toggleMonthlyTodo(todoId, monthKey);

    return NextResponse.json({ todo });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
