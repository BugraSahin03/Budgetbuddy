import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { updateTransactionDisplayNameOverrideForMonth } from "@/src/transactions/repository";

type MonthDisplayNameRouteContext = {
  params: Promise<{ monthKey: string }>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Anzeigename konnte nicht gespeichert werden.";
}

function parseTransactionId(value: unknown): number {
  const transactionId =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new Error("Transaktions-ID ist ungültig.");
  }

  return transactionId;
}

function parseDisplayNameOverride(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function revalidateMonthContext(monthKey: string): void {
  revalidatePath("/");
  revalidatePath("/monate");
  revalidatePath(`/monate/${monthKey}`);
  revalidatePath("/transaktionen");
  revalidatePath("/import");
  revalidatePath("/auswertungen");
}

export async function PATCH(
  request: Request,
  { params }: MonthDisplayNameRouteContext,
) {
  const { monthKey } = await params;

  try {
    const body = (await request.json()) as {
      displayNameOverride?: unknown;
      transactionId?: unknown;
    };
    const transactionId = parseTransactionId(body.transactionId);
    const displayNameOverride = parseDisplayNameOverride(
      body.displayNameOverride,
    );

    updateTransactionDisplayNameOverrideForMonth(
      transactionId,
      monthKey,
      displayNameOverride,
    );
    revalidateMonthContext(monthKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
