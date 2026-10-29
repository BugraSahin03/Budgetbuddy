// Run as root on the Alfred host after deploying the workspace and memory plugin.
import { readFileSync, writeFileSync, renameSync, chownSync, statSync } from "node:fs";

const file = "/var/lib/alfred/.openclaw/openclaw.json";
const original = statSync(file);
const config = JSON.parse(readFileSync(file, "utf8"));
const env = readFileSync("/etc/alfred-finance-coach.env", "utf8");
const recipient = env.match(/^ALFRED_TELEGRAM_TARGET\s*=\s*["']?(\d+)["']?\s*$/m)?.[1];
if (!recipient) throw new Error("Missing Telegram owner target");
const main = config.agents.list.find((agent) => agent.id === "main");
if (!main) throw new Error("Missing Alfred agent");
main.tools.alsoAllow = [...new Set([...main.tools.alsoAllow, "memory_save"])];
main.heartbeat = {
  every: "6h",
  session: "agent:main:main",
  target: "telegram",
  to: recipient,
  accountId: "default",
  activeHours: { start: "10:00", end: "20:00", timezone: "Europe/Berlin" },
  skipWhenBusy: true,
  isolatedSession: false,
  lightContext: false,
  includeReasoning: false,
  prompt: "Lies HEARTBEAT.md und prüfe anhand des Gesprächs, des persönlichen Kontextes und relevanter aktueller Snapshots, ob ein hilfreicher Anlass besteht. Wenn nicht, antworte ausschließlich HEARTBEAT_OK.",
};
const temporary = `${file}.coach-trial.tmp`;
writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
chownSync(temporary, original.uid, original.gid);
renameSync(temporary, file);
console.log("Alfred conversational memory and daytime heartbeat configured; no credentials printed.");
