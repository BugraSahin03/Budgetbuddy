import { chownSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";

const file = "/var/lib/alfred/.openclaw/openclaw.json";
const { uid, gid } = statSync(file);
const config = JSON.parse(readFileSync(file, "utf8"));
const main = config.agents?.list?.find((entry) => entry.id === "main");
if (!Array.isArray(main?.tools?.alsoAllow) ||
    !main.tools.alsoAllow.includes("budgetbuddy_snapshot")) {
  throw new Error("Missing Alfred BudgetBuddy tool configuration");
}
main.tools.alsoAllow = [...new Set([...main.tools.alsoAllow, "budgetbuddy_query"])];
const temp = `${file}.budgetbuddy-query.tmp`;
writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: "wx" });
chownSync(temp, uid, gid);
renameSync(temp, file);
