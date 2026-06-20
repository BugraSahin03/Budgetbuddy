import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import {
  decryptBackupFile,
  encryptedFileNameFor,
  pullAndEncryptOffsiteBackups,
  resolveOffsiteSource,
  resolveOffsiteTargetDir,
  runIntegrityCheck,
} from "../scripts/backup/offsite-lib.mjs";

const tmpPaths: string[] = [];

afterEach(() => {
  for (const tmpPath of tmpPaths.splice(0)) {
    fs.rmSync(tmpPath, { recursive: true, force: true });
  }
});

function createTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "budgetbuddy-offsite-test-"));
  tmpPaths.push(root);
  return root;
}

function createBackupDb(dbPath: string, value: string) {
  const db = new Database(dbPath);
  db.exec("CREATE TABLE probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL);");
  db.prepare("INSERT INTO probe (value) VALUES (?)").run(value);
  db.close();
}

describe("offsite backup", () => {
  it("uses the Mac backup folder as default target", () => {
    const target = resolveOffsiteTargetDir({ env: {}, cwd: "/repo" });

    expect(target).toBe(path.join(os.homedir(), "Backups", "BudgetBuddy"));
  });

  it("requires an explicit backup source", () => {
    expect(() => resolveOffsiteSource({ env: {} })).toThrow("Missing offsite source");
  });

  it("pulls local FIN-092 backup files and stores only encrypted files in target", () => {
    const root = createTempRoot();
    const sourceDir = path.join(root, "source");
    const targetDir = path.join(root, "target");
    const passphraseFile = path.join(root, "passphrase");
    const sourceBackup = path.join(sourceDir, "budgetbuddy-2026-06-20T10-00-00-000Z.db");
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(passphraseFile, "test-only-not-a-secret-passphrase-for-offsite-tests");
    createBackupDb(sourceBackup, "offsite-ok");

    const result = pullAndEncryptOffsiteBackups({
      source: sourceDir,
      targetDir,
      passphraseFile,
    });

    const encryptedPath = path.join(targetDir, encryptedFileNameFor(sourceBackup));
    expect(result.encrypted).toEqual([encryptedPath]);
    expect(fs.existsSync(encryptedPath)).toBe(true);
    expect(fs.existsSync(path.join(targetDir, path.basename(sourceBackup)))).toBe(false);
    expect(fs.readFileSync(encryptedPath, "utf8")).not.toContain("offsite-ok");

    const restorePath = path.join(root, "restore.db");
    decryptBackupFile({
      inputPath: encryptedPath,
      outputPath: restorePath,
      passphrase: "test-only-not-a-secret-passphrase-for-offsite-tests",
    });

    expect(runIntegrityCheck(restorePath)).toBe("ok");
    const restoreDb = new Database(restorePath, { readonly: true, fileMustExist: true });
    try {
      expect(restoreDb.prepare("SELECT value FROM probe").get()).toEqual({ value: "offsite-ok" });
    } finally {
      restoreDb.close();
    }
  });

  it("skips already encrypted backups on later runs", () => {
    const root = createTempRoot();
    const sourceDir = path.join(root, "source");
    const targetDir = path.join(root, "target");
    const passphraseFile = path.join(root, "passphrase");
    const sourceBackup = path.join(sourceDir, "budgetbuddy-2026-06-20T10-00-00-000Z.db");
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(passphraseFile, "test-only-not-a-secret-passphrase-for-offsite-tests");
    createBackupDb(sourceBackup, "offsite-ok");

    const first = pullAndEncryptOffsiteBackups({ source: sourceDir, targetDir, passphraseFile });
    const second = pullAndEncryptOffsiteBackups({ source: sourceDir, targetDir, passphraseFile });

    expect(first.encrypted).toHaveLength(1);
    expect(second.encrypted).toEqual([]);
    expect(second.skipped).toEqual(first.encrypted);
  });
});
