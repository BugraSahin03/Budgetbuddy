import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildBackupFileName,
  createBackup,
  resolveBackupDir,
  resolveDatabasePath,
  resolveRetentionDays,
  rotateBackups,
  runIntegrityCheck,
} from "../scripts/backup/lib.mjs";

const tmpPaths: string[] = [];

afterEach(() => {
  for (const tmpPath of tmpPaths.splice(0)) {
    fs.rmSync(tmpPath, { recursive: true, force: true });
  }
});

function createTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "budgetbuddy-backup-test-"));
  tmpPaths.push(root);
  return root;
}

function createSqliteDb(dbPath: string) {
  const db = new Database(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE entries (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    INSERT INTO entries (name) VALUES ('before-backup');
  `);
  return db;
}

describe("backup lib", () => {
  it("resolves default database path", () => {
    const cwd = "/tmp/project";
    expect(resolveDatabasePath({}, cwd)).toBe(path.resolve(cwd, "data", "budgetbuddy.db"));
  });

  it("uses backup dir from cli over env", () => {
    const cwd = "/tmp/project";
    const env = { BUDGETBUDDY_BACKUP_DIR: "from-env" };

    const backupDir = resolveBackupDir({
      cliBackupDir: "from-cli",
      env,
      cwd,
    });

    expect(backupDir).toBe(path.resolve(cwd, "from-cli"));
  });

  it("uses retention days from cli over env", () => {
    const env = { BUDGETBUDDY_BACKUP_RETENTION_DAYS: "14" };

    expect(resolveRetentionDays({ cliRetentionDays: "7", env })).toBe(7);
    expect(resolveRetentionDays({ env })).toBe(14);
  });

  it("rejects invalid retention days", () => {
    expect(() => resolveRetentionDays({ cliRetentionDays: "7days" })).toThrow("Retention days");
  });

  it("creates a SQLite-safe backup while the source connection is open", async () => {
    const root = createTempRoot();
    const dbPath = path.join(root, "budgetbuddy.db");
    const backupDir = path.join(root, "backups");
    const sourceDb = createSqliteDb(dbPath);

    try {
      sourceDb.prepare("INSERT INTO entries (name) VALUES (?)").run("during-runtime");

      const result = await createBackup({
        databasePath: dbPath,
        backupDir,
        now: new Date("2026-05-24T09:00:00.000Z"),
      });

      expect(result.backupPath).toContain("budgetbuddy-2026-05-24T09-00-00-000Z.db");
      expect(result.integrityResult).toBe("ok");
      expect(result.deletedBackups).toEqual([]);
      expect(fs.statSync(result.backupPath).mode & 0o777).toBe(0o600);
      expect(runIntegrityCheck(result.backupPath)).toBe("ok");

      const backupDb = new Database(result.backupPath, { readonly: true, fileMustExist: true });
      try {
        const rows = backupDb.prepare("SELECT name FROM entries ORDER BY id").all() as Array<{ name: string }>;
        expect(rows.map((row) => row.name)).toEqual(["before-backup", "during-runtime"]);
      } finally {
        backupDb.close();
      }
    } finally {
      sourceDb.close();
    }
  });

  it("rotates old timestamped backup files and keeps unrelated files", () => {
    const root = createTempRoot();
    const backupDir = path.join(root, "backups");
    fs.mkdirSync(backupDir, { recursive: true });

    const oldBackup = path.join(backupDir, "budgetbuddy-old.db");
    const recentBackup = path.join(backupDir, "budgetbuddy-recent.db");
    const unrelated = path.join(backupDir, "notes.txt");

    fs.writeFileSync(oldBackup, "old");
    fs.writeFileSync(recentBackup, "recent");
    fs.writeFileSync(unrelated, "keep");

    fs.utimesSync(oldBackup, new Date("2026-04-01T00:00:00.000Z"), new Date("2026-04-01T00:00:00.000Z"));
    fs.utimesSync(recentBackup, new Date("2026-05-20T00:00:00.000Z"), new Date("2026-05-20T00:00:00.000Z"));

    const deleted = rotateBackups({
      backupDir,
      retentionDays: 30,
      now: new Date("2026-05-24T09:00:00.000Z"),
    });

    expect(deleted).toEqual([oldBackup]);
    expect(fs.existsSync(oldBackup)).toBe(false);
    expect(fs.existsSync(recentBackup)).toBe(true);
    expect(fs.existsSync(unrelated)).toBe(true);
  });

  it("produces timestamped file names", () => {
    const name = buildBackupFileName(new Date("2026-05-24T09:00:00.000Z"));
    expect(name).toBe("budgetbuddy-2026-05-24T09-00-00-000Z.db");
  });
});
