#!/usr/bin/env node
import { pullAndEncryptOffsiteBackups } from "./offsite-lib.mjs";

function parseArgs(argv) {
  const args = { source: undefined, targetDir: undefined, passphraseFile: undefined };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--source") {
      args.source = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === "--target-dir") {
      args.targetDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === "--passphrase-file") {
      args.passphraseFile = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const result = pullAndEncryptOffsiteBackups(args);

  console.log("Offsite source:", result.source);
  console.log("Offsite target:", result.targetDir);
  console.log("Encrypted backups:", result.encrypted.length);
  console.log("Skipped existing backups:", result.skipped.length);
} catch (error) {
  console.error("Offsite backup failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
