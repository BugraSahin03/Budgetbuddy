import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

export const OFFSITE_TARGET_DIR_ENV = "BUDGETBUDDY_OFFSITE_TARGET_DIR";
export const OFFSITE_SOURCE_ENV = "BUDGETBUDDY_OFFSITE_SOURCE";
export const OFFSITE_PASSPHRASE_FILE_ENV = "BUDGETBUDDY_OFFSITE_PASSPHRASE_FILE";
export const OFFSITE_SSH_OPTIONS_ENV = "BUDGETBUDDY_OFFSITE_SSH_OPTIONS";
export const DEFAULT_OFFSITE_TARGET_DIR = "~/Backups/BudgetBuddy";
export const ENCRYPTED_BACKUP_EXTENSION = ".enc";
const FILE_MAGIC = "BBOFFSITE1";
const SCRYPT_KEY_LENGTH = 32;

export function expandHome(input, homeDir = os.homedir()) {
  if (input === "~") {
    return homeDir;
  }

  if (input?.startsWith("~/")) {
    return path.join(homeDir, input.slice(2));
  }

  return input;
}

export function resolveOffsiteTargetDir({ cliTargetDir, env = process.env, cwd = process.cwd() } = {}) {
  const configured = cliTargetDir?.trim() || env[OFFSITE_TARGET_DIR_ENV]?.trim() || DEFAULT_OFFSITE_TARGET_DIR;
  return path.resolve(cwd, expandHome(configured));
}

export function resolveOffsiteSource({ cliSource, env = process.env } = {}) {
  const source = cliSource?.trim() || env[OFFSITE_SOURCE_ENV]?.trim();
  if (!source) {
    throw new Error(`Missing offsite source. Set ${OFFSITE_SOURCE_ENV} or pass --source.`);
  }

  return source;
}

export function resolvePassphraseFile({ cliPassphraseFile, env = process.env, cwd = process.cwd() } = {}) {
  const configured = cliPassphraseFile?.trim() || env[OFFSITE_PASSPHRASE_FILE_ENV]?.trim();
  if (!configured) {
    throw new Error(`Missing passphrase file. Set ${OFFSITE_PASSPHRASE_FILE_ENV} or pass --passphrase-file.`);
  }

  return path.resolve(cwd, expandHome(configured));
}

export function readPassphrase(passphraseFile) {
  const passphrase = fs.readFileSync(passphraseFile, "utf8").trim();
  if (passphrase.length < 16) {
    throw new Error("Offsite backup passphrase must contain at least 16 characters.");
  }

  return passphrase;
}

export function listPlainBackupFiles(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^budgetbuddy-.*\.db$/.test(entry.name))
    .map((entry) => path.join(sourceDir, entry.name))
    .sort();
}

export function encryptedFileNameFor(backupFilePath) {
  return `${path.basename(backupFilePath)}${ENCRYPTED_BACKUP_EXTENSION}`;
}

export function encryptBackupFile({ inputPath, outputPath, passphrase }) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, SCRYPT_KEY_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = fs.readFileSync(inputPath);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = {
    magic: FILE_MAGIC,
    kdf: "scrypt",
    cipher: "aes-256-gcm",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
}

export function decryptBackupFile({ inputPath, outputPath, passphrase }) {
  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (payload.magic !== FILE_MAGIC || payload.kdf !== "scrypt" || payload.cipher !== "aes-256-gcm") {
    throw new Error("Unsupported encrypted offsite backup format.");
  }

  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const key = crypto.scryptSync(passphrase, salt, SCRYPT_KEY_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  fs.writeFileSync(outputPath, plaintext, { mode: 0o600 });
}

export function runIntegrityCheck(databasePath) {
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

export function isRemoteSource(source) {
  return source.includes(":") && !source.startsWith("/") && !source.startsWith("./") && !source.startsWith("../");
}

function buildRsyncArgs({ source, destinationDir, sshOptions }) {
  const args = ["-av", "--ignore-existing", "--include", "budgetbuddy-*.db", "--exclude", "*"];
  if (sshOptions?.trim()) {
    args.push("-e", `ssh ${sshOptions.trim()}`);
  }

  const normalizedSource = source.endsWith("/") ? source : `${source}/`;
  args.push(normalizedSource, `${destinationDir}/`);
  return args;
}

export function syncBackupSource({ source, stagingDir, env = process.env }) {
  fs.mkdirSync(stagingDir, { recursive: true });

  if (isRemoteSource(source)) {
    const args = buildRsyncArgs({
      source,
      destinationDir: stagingDir,
      sshOptions: env[OFFSITE_SSH_OPTIONS_ENV],
    });
    const result = spawnSync("rsync", args, { encoding: "utf8" });

    if (result.status !== 0) {
      const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
      throw new Error(`rsync failed: ${message}`);
    }

    return;
  }

  const sourceDir = path.resolve(expandHome(source));
  for (const backupFile of listPlainBackupFiles(sourceDir)) {
    const destinationPath = path.join(stagingDir, path.basename(backupFile));
    if (!fs.existsSync(destinationPath)) {
      fs.copyFileSync(backupFile, destinationPath);
    }
  }
}

export function encryptStagedBackups({ stagingDir, targetDir, passphrase }) {
  fs.mkdirSync(targetDir, { recursive: true });
  const encrypted = [];
  const skipped = [];

  for (const backupFile of listPlainBackupFiles(stagingDir)) {
    const targetPath = path.join(targetDir, encryptedFileNameFor(backupFile));
    if (fs.existsSync(targetPath)) {
      skipped.push(targetPath);
      fs.rmSync(backupFile, { force: true });
      continue;
    }

    const tempTargetPath = `${targetPath}.tmp-${process.pid}`;
    fs.rmSync(tempTargetPath, { force: true });
    encryptBackupFile({ inputPath: backupFile, outputPath: tempTargetPath, passphrase });
    fs.renameSync(tempTargetPath, targetPath);
    fs.rmSync(backupFile, { force: true });
    encrypted.push(targetPath);
  }

  return { encrypted, skipped };
}

export function pullAndEncryptOffsiteBackups({ source, targetDir, passphraseFile, stagingDir, env = process.env } = {}) {
  const resolvedSource = resolveOffsiteSource({ cliSource: source, env });
  const resolvedTargetDir = resolveOffsiteTargetDir({ cliTargetDir: targetDir, env });
  const resolvedPassphraseFile = resolvePassphraseFile({ cliPassphraseFile: passphraseFile, env });
  const passphrase = readPassphrase(resolvedPassphraseFile);
  const resolvedStagingDir = stagingDir || fs.mkdtempSync(path.join(os.tmpdir(), "budgetbuddy-offsite-"));

  try {
    syncBackupSource({ source: resolvedSource, stagingDir: resolvedStagingDir, env });
    const result = encryptStagedBackups({
      stagingDir: resolvedStagingDir,
      targetDir: resolvedTargetDir,
      passphrase,
    });

    return {
      source: resolvedSource,
      targetDir: resolvedTargetDir,
      encrypted: result.encrypted,
      skipped: result.skipped,
    };
  } finally {
    fs.rmSync(resolvedStagingDir, { recursive: true, force: true });
  }
}
