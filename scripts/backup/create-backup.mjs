#!/usr/bin/env node
import { createBackup, resolveBackupDir, resolveDatabasePath } from "./lib.mjs";

function parseArgs(argv) {
  const args = { backupDir: undefined };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--backup-dir") {
      args.backupDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const databasePath = resolveDatabasePath();
  const backupDir = resolveBackupDir({ cliBackupDir: args.backupDir });
  const backupFilePath = createBackup({ databasePath, backupDir });

  console.log("Backup created:", backupFilePath);
}

try {
  main();
} catch (error) {
  console.error("Backup failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
