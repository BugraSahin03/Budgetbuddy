import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export const DB_PATH_ENV = "BUDGETBUDDY_DB_PATH";
export const BACKUP_DIR_ENV = "BUDGETBUDDY_BACKUP_DIR";
export const RETENTION_DAYS_ENV = "BUDGETBUDDY_BACKUP_RETENTION_DAYS";
export const DEFAULT_RETENTION_DAYS = 30;

export function resolveDatabasePath(env = process.env, cwd = process.cwd()) {
  const configured = env[DB_PATH_ENV]?.trim();
  if (configured) {
    return path.resolve(cwd, configured);
  }

  return path.resolve(cwd, "data", "budgetbuddy.db");
}

export function resolveBackupDir({ cliBackupDir, env = process.env, cwd = process.cwd() } = {}) {
  const fromCli = cliBackupDir?.trim();
  if (fromCli) {
    return path.resolve(cwd, fromCli);
  }

  const fromEnv = env[BACKUP_DIR_ENV]?.trim();
  if (fromEnv) {
    return path.resolve(cwd, fromEnv);
  }

  return path.resolve(cwd, "data", "backups");
}

export function resolveRetentionDays({ cliRetentionDays, env = process.env } = {}) {
  const rawValue = cliRetentionDays ?? env[RETENTION_DAYS_ENV] ?? String(DEFAULT_RETENTION_DAYS);
  const normalizedValue = String(rawValue).trim();
  const parsed = Number.parseInt(normalizedValue, 10);

  if (!/^\d+$/.test(normalizedValue) || !Number.isFinite(parsed)) {
    throw new Error(`Retention days must be a non-negative integer: ${rawValue}`);
  }

  return parsed;
}

export function buildBackupFileName(date = new Date()) {
  const iso = date.toISOString().replace(/[:.]/g, "-");
  return `budgetbuddy-${iso}.db`;
}

export function ensureReadableFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Database file not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Database path is not a file: ${filePath}`);
  }
}

export function runIntegrityCheck(databasePath) {
  ensureReadableFile(databasePath);

  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const rows = db.pragma("integrity_check");
    const result = rows.map((row) => row.integrity_check).join("\n");

    if (result !== "ok") {
      throw new Error(`Backup integrity check failed: ${result}`);
    }

    return result;
  } finally {
    db.close();
  }
}

export function rotateBackups({ backupDir, retentionDays, now = new Date() }) {
  if (retentionDays === 0 || !fs.existsSync(backupDir)) {
    return [];
  }

  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const deleted = [];

  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^budgetbuddy-.*\.db$/.test(entry.name)) {
      continue;
    }

    const entryPath = path.join(backupDir, entry.name);
    const stat = fs.statSync(entryPath);
    if (stat.mtime.getTime() < cutoffMs) {
      fs.rmSync(entryPath, { force: true });
      deleted.push(entryPath);
    }
  }

  return deleted.sort();
}

export async function createBackup({
  databasePath,
  backupDir,
  now = new Date(),
  retentionDays = DEFAULT_RETENTION_DAYS,
} = {}) {
  ensureReadableFile(databasePath);
  fs.mkdirSync(backupDir, { recursive: true });

  const backupFilePath = path.join(backupDir, buildBackupFileName(now));
  const tempBackupPath = `${backupFilePath}.tmp-${process.pid}`;

  if (fs.existsSync(backupFilePath)) {
    throw new Error(`Backup target already exists: ${backupFilePath}`);
  }

  fs.rmSync(tempBackupPath, { force: true });

  const sourceDb = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    await sourceDb.backup(tempBackupPath);
  } finally {
    sourceDb.close();
  }

  const integrityResult = runIntegrityCheck(tempBackupPath);
  fs.renameSync(tempBackupPath, backupFilePath);

  const deletedBackups = rotateBackups({ backupDir, retentionDays, now });

  return {
    backupPath: backupFilePath,
    deletedBackups,
    integrityResult,
  };
}
