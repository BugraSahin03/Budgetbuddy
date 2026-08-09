#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants, closeSync, fstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const BUDGETBUDDY_MAX_AGE_MINUTES = 150;
export const GETQUIN_MAX_AGE_MINUTES = 42 * 60;
const MAX_FILE_BYTES = 4_000_000;
const DEFAULT_PATHS = {
  budgetbuddy: "/var/lib/alfred-snapshots/budgetbuddy/latest.json",
  getquin: "/var/lib/alfred-snapshots/getquin/latest.json",
  state: "/var/lib/alfred/proactive/monitor-state.json",
};

process.umask(0o077);

function readJsonNoFollow(filePath, optional = false) {
  let descriptor;
  try {
    descriptor = openSync(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_FILE_BYTES) {
      throw new Error("Datei ist nicht regulär oder außerhalb der Größenbegrenzung.");
    }
    if ((stats.mode & 0o022) !== 0) {
      throw new Error("Datei darf nicht gruppen- oder weltbeschreibbar sein.");
    }
    return JSON.parse(readFileSync(descriptor, "utf8"));
  } catch (error) {
    if (optional && error?.code === "ENOENT") return null;
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function ageMinutes(capturedAt, now) {
  const value = Date.parse(capturedAt);
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - value) / 60_000);
}

function hasValidIntegrity(snapshot) {
  if (snapshot?.integrity?.algorithm !== "sha256" || !/^[a-f0-9]{64}$/.test(snapshot.integrity.dataSha256 ?? "")) {
    return false;
  }
  const withoutIntegrity = Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== "integrity"));
  const actual = createHash("sha256").update(JSON.stringify({ ...withoutIntegrity, capturedAt: undefined })).digest("hex");
  return actual === snapshot.integrity.dataSha256;
}

function signal(key, source, kind, text) {
  return { key, source, kind, text };
}

function berlinCalendarParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
}

export function evaluateSignals({ budgetbuddy, getquin, now = new Date() }) {
  const signals = [];

  if (!budgetbuddy || budgetbuddy.contractVersion !== "budgetbuddy.coach.snapshot.v2" || !hasValidIntegrity(budgetbuddy)) {
    signals.push(signal("budgetbuddy-unavailable", "BudgetBuddy", "technical", "BudgetBuddy-Daten sind nicht lesbar oder fehlen."));
  } else {
    const age = ageMinutes(budgetbuddy.capturedAt, now);
    if (age < -5) {
      signals.push(signal("budgetbuddy-future", "BudgetBuddy", "technical", "Der BudgetBuddy-Datenstand liegt unerwartet in der Zukunft."));
    } else if (age > BUDGETBUDDY_MAX_AGE_MINUTES) {
      signals.push(signal("budgetbuddy-stale", "BudgetBuddy", "technical", `Der BudgetBuddy-Datenstand ist ${age} Minuten alt.`));
    }
    if (budgetbuddy.dataQuality?.complete === false) {
      signals.push(signal("budgetbuddy-incomplete", "BudgetBuddy", "technical", "BudgetBuddy meldet einen unvollständigen Datenstand."));
    }
    if ((budgetbuddy.dataQuality?.unsupportedCurrencyCount ?? 0) > 0) {
      signals.push(signal("budgetbuddy-currency", "BudgetBuddy", "technical", "BudgetBuddy enthält Buchungen in derzeit nicht unterstützten Währungen."));
    }
    const month = budgetbuddy.months?.find((entry) => entry.monthKey === budgetbuddy.currentMonthKey);
    if (month) {
      const count = month.unassignedExpenseCount ?? 0;
      const cents = month.unassignedExpenseCents ?? 0;
      if (count >= 5 || cents >= 25_000) {
        signals.push(signal("budgetbuddy-unassigned", "BudgetBuddy", "financial", `Im laufenden Monat sind ${count} Ausgaben über insgesamt ${(cents / 100).toFixed(2)} Euro noch nicht zugeordnet.`));
      }

      const [year, monthNumber] = String(month.monthKey).split("-").map(Number);
      const local = berlinCalendarParts(now);
      const day = local.year === year && local.month === monthNumber
        ? local.day
        : 0;
      const daysInMonth = year && monthNumber ? new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() : 0;
      const actual = month.consumerExpenseCents ?? 0;
      const planned = month.plannedCategoryBudgetsCents ?? 0;
      if (day >= 7 && daysInMonth > 0 && actual >= 25_000 && planned > 0) {
        const projected = actual / (day / daysInMonth);
        if (projected > planned * 1.25) {
          signals.push(signal("budgetbuddy-spending-pace", "BudgetBuddy", "financial", `Das aktuelle Tempo der variablen Ausgaben liegt hochgerechnet mehr als 25 Prozent über dem Kategorienbudget. Hochrechnung: ${(projected / 100).toFixed(2)} Euro; Plan: ${(planned / 100).toFixed(2)} Euro.`));
        }
      }
    }
  }

  if (!getquin || getquin.contractVersion !== "getquin.portfolio.snapshot.v1" || !hasValidIntegrity(getquin)) {
    signals.push(signal("getquin-unavailable", "Getquin", "technical", "Getquin-Daten sind nicht lesbar oder fehlen."));
  } else {
    const age = ageMinutes(getquin.capturedAt, now);
    if (age < -5) {
      signals.push(signal("getquin-future", "Getquin", "technical", "Der Getquin-Datenstand liegt unerwartet in der Zukunft."));
    } else if (age > GETQUIN_MAX_AGE_MINUTES) {
      signals.push(signal("getquin-stale", "Getquin", "technical", `Der Getquin-Datenstand ist ${Math.floor(age / 60)} Stunden alt.`));
    }
    if (getquin.dataQuality?.complete === false) {
      signals.push(signal("getquin-incomplete", "Getquin", "technical", "Getquin meldet einen unvollständigen Datenstand."));
    }
  }

  return signals.sort((a, b) => a.key.localeCompare(b.key));
}

export function compareSignalState(previous = [], current = []) {
  const previousByKey = new Map(previous.map((item) => [item.key, item]));
  const currentKeys = new Set(current.map((item) => item.key));
  return {
    opened: current.filter((item) => !previousByKey.has(item.key)),
    recovered: previous.filter((item) => item.kind === "technical" && !currentKeys.has(item.key)),
  };
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALFRED_TELEGRAM_TARGET;
  if (!token || !chatId) throw new Error("Telegram-Konfiguration fehlt.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram-Zustellung fehlgeschlagen (${response.status}).`);
}

function writeState(filePath, signals, now) {
  mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.tmp`;
  const state = { version: 1, updatedAt: now.toISOString(), activeSignals: signals.map(({ key, source, kind }) => ({ key, source, kind })) };
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, filePath);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  let budgetbuddy = null;
  let getquin = null;
  try { budgetbuddy = readJsonNoFollow(DEFAULT_PATHS.budgetbuddy); } catch {}
  try { getquin = readJsonNoFollow(DEFAULT_PATHS.getquin); } catch {}
  const state = readJsonNoFollow(DEFAULT_PATHS.state, true);
  const current = evaluateSignals({ budgetbuddy, getquin, now });
  const changes = compareSignalState(state?.activeSignals ?? [], current);

  if (dryRun) {
    console.log(JSON.stringify({ active: current.map((item) => item.key), newlyOpened: changes.opened.map((item) => item.key) }));
    return;
  }
  for (const item of changes.opened) {
    const heading = item.kind === "technical" ? "⚠️ Alfred Datenwarnung" : "🧭 Alfred Finanzhinweis";
    await sendTelegram(`${heading}\n\n${item.text}\n\nIch melde diesen Zustand erst wieder, nachdem er zwischenzeitlich behoben war.`);
  }
  for (const item of changes.recovered) {
    await sendTelegram(`✅ Alfred Entwarnung\n\n${item.source} ist wieder aktuell und lesbar.`);
  }
  writeState(DEFAULT_PATHS.state, current, now);
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
