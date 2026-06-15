import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { updateExpenseAssignmentForMonth } from "@/src/transactions/repository";

type MonthAssignmentRouteContext = {
  params: Promise<{ monthKey: string }>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Zuordnung konnte nicht gespeichert werden.";
}

function parseTransactionId(value: unknown): number {
  const transactionId =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("Transaktions-ID ist ungueltig.");
  }

  return transactionId;
}

function parseAssignment(value: unknown): {
  categoryId: number | null;
  specialBudgetId: number | null;
} {
  const assignment = typeof value === "string" ? value.trim() : "";

  if (assignment.length === 0) {
    return {
      categoryId: null,
      specialBudgetId: null,
    };
  }

  const categoryMatch = assignment.match(/^category:(\d+)$/);
  if (categoryMatch) {
    return {
      categoryId: Number.parseInt(categoryMatch[1], 10),
      specialBudgetId: null,
    };
  }

  const specialBudgetMatch = assignment.match(/^specialBudget:(\d+)$/);
  if (specialBudgetMatch) {
    return {
      categoryId: null,
      specialBudgetId: Number.parseInt(specialBudgetMatch[1], 10),
    };
  }

  throw new Error("Kategoriezuordnung ist ungueltig.");
}

function revalidateMonthContext(monthKey: string): void {
  revalidatePath("/");
  revalidatePath("/monate");
  revalidatePath(`/monate/${monthKey}`);
  revalidatePath("/transaktionen");
  revalidatePath("/sonderbudgets");
  revalidatePath("/auswertungen");
}

export async function PATCH(
  request: Request,
  { params }: MonthAssignmentRouteContext,
) {
  const { monthKey } = await params;

  try {
    const body = (await request.json()) as {
      assignment?: unknown;
      transactionId?: unknown;
    };
    const transactionId = parseTransactionId(body.transactionId);
    const assignment = parseAssignment(body.assignment);

    updateExpenseAssignmentForMonth(transactionId, monthKey, assignment);
    revalidateMonthContext(monthKey);

    return NextResponse.json({ assignment: body.assignment ?? "" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
