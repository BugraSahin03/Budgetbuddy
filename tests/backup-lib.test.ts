import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildBackupFileName,
  createBackup,
  resolveBackupDir,
  resolveDatabasePath,
} from "../scripts/backup/lib.mjs";

const tmpPaths: string[] = [];

afterEach(() => {
  for (const tmpPath of tmpPaths.splice(0)) {
    fs.rmSync(tmpPath, { recursive: true, force: true });
  }
});

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

  it("creates backup file", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "budgetbuddy-backup-test-"));
    tmpPaths.push(root);

    const dbPath = path.join(root, "budgetbuddy.db");
    const backupDir = path.join(root, "backups");

    fs.writeFileSync(dbPath, "db-content");

    const backupPath = createBackup({
      databasePath: dbPath,
      backupDir,
      now: new Date("2026-05-24T09:00:00.000Z"),
    });

    expect(backupPath).toContain("budgetbuddy-2026-05-24T09-00-00-000Z.db");
    expect(fs.readFileSync(backupPath, "utf8")).toBe("db-content");
  });

  it("produces timestamped file names", () => {
    const name = buildBackupFileName(new Date("2026-05-24T09:00:00.000Z"));
    expect(name).toBe("budgetbuddy-2026-05-24T09-00-00-000Z.db");
  });
});
