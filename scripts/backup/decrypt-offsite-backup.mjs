#!/usr/bin/env node
import { decryptBackupFile, readPassphrase, resolvePassphraseFile, runIntegrityCheck } from "./offsite-lib.mjs";

function parseArgs(argv) {
  const args = { input: undefined, output: undefined, passphraseFile: undefined, checkIntegrity: true };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--input") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === "--output") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === "--passphrase-file") {
      args.passphraseFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === "--no-integrity-check") {
      args.checkIntegrity = false;
    }
  }

  if (!args.input || !args.output) {
    throw new Error("Usage: decrypt-offsite-backup.mjs --input <backup.db.enc> --output <restore.db> --passphrase-file <file>");
  }

  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const passphraseFile = resolvePassphraseFile({ cliPassphraseFile: args.passphraseFile });
  const passphrase = readPassphrase(passphraseFile);

  decryptBackupFile({ inputPath: args.input, outputPath: args.output, passphrase });
  console.log("Decrypted backup:", args.output);

  if (args.checkIntegrity) {
    console.log("Integrity check:", runIntegrityCheck(args.output));
  }
} catch (error) {
  console.error("Offsite restore failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
