import fs from "node:fs";
import path from "node:path";

export const DB_PATH_ENV = "BUDGETBUDDY_DB_PATH";
export const BACKUP_DIR_ENV = "BUDGETBUDDY_BACKUP_DIR";

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

export function createBackup({ databasePath, backupDir, now = new Date() }) {
  ensureReadableFile(databasePath);
  fs.mkdirSync(backupDir, { recursive: true });

  const backupFilePath = path.join(backupDir, buildBackupFileName(now));
  fs.copyFileSync(databasePath, backupFilePath);

  return backupFilePath;
}
