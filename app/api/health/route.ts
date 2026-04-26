import { NextResponse } from "next/server";

import { getDb, getSchemaVersion } from "@/src/db/client";

export const runtime = "nodejs";

export async function GET() {
  const row = getDb().prepare("SELECT 1 AS ok").get() as { ok: number };

  return NextResponse.json({
    status: "ok",
    sqliteReady: row.ok === 1,
    schemaVersion: getSchemaVersion(),
  });
}

