#!/usr/bin/env node
import {
  createBackup,
  resolveBackupDir,
  resolveDatabasePath,
  resolveRetentionDays,
} from "./lib.mjs";

function parseArgs(argv) {
  const args = { backupDir: undefined, retentionDays: undefined };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--backup-dir") {
      args.backupDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === "--retention-days") {
      args.retentionDays = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databasePath = resolveDatabasePath();
  const backupDir = resolveBackupDir({ cliBackupDir: args.backupDir });
  const retentionDays = resolveRetentionDays({ cliRetentionDays: args.retentionDays });
  const result = await createBackup({ databasePath, backupDir, retentionDays });

  console.log("Backup created:", result.backupPath);
  console.log("Integrity check:", result.integrityResult);
  console.log("Deleted old backups:", result.deletedBackups.length);
}

try {
  await main();
} catch (error) {
  console.error("Backup failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
