import path from "node:path";

export const DATABASE_PATH_ENV = "BUDGETBUDDY_DB_PATH";
export const DEFAULT_DATABASE_DIR = "data";
export const DEFAULT_DATABASE_FILE = "budgetbuddy.db";

export function resolveDatabasePath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configuredPath = env[DATABASE_PATH_ENV]?.trim();

  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.resolve(process.cwd(), DEFAULT_DATABASE_DIR, DEFAULT_DATABASE_FILE);
}

