import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { resolveDatabasePath } from "@/src/db/config";
import { applyMigrations, getLatestSchemaVersion } from "@/src/db/schema";

let sqliteConnection: Database.Database | null = null;

function createConnection(): Database.Database {
  const databasePath = resolveDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!sqliteConnection) {
    sqliteConnection = createConnection();
  }

  return sqliteConnection;
}

export function getSchemaVersion(): string {
  const row = getDb()
    .prepare("SELECT value FROM app_meta WHERE key = 'schema_version' LIMIT 1")
    .get() as { value?: string } | undefined;

  return row?.value ?? getLatestSchemaVersion();
}
