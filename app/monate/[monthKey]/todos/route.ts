import { NextResponse } from "next/server";

import { createMonthlyTodo } from "@/src/month-todos/repository";

type MonthTodoRouteContext = {
  params: Promise<{ monthKey: string }>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "ToDo konnte nicht gespeichert werden.";
}

export async function POST(
  request: Request,
  { params }: MonthTodoRouteContext,
) {
  const { monthKey } = await params;

  try {
    const body = (await request.json()) as { text?: unknown };
    const todo = createMonthlyTodo(
      monthKey,
      typeof body.text === "string" ? body.text : "",
    );

    return NextResponse.json({ todo });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
