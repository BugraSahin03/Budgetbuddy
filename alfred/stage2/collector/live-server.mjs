import { chmodSync } from "node:fs";
import { createServer } from "node:http";
import { openReadOnlyDatabase } from "./collector.mjs";
import { queryBudgetBuddy } from "./live-query.mjs";

const socket = "/run/alfred-budgetbuddy-query/query.sock";
const databasePath = "/var/lib/budgetbuddy/budgetbuddy.db";
openReadOnlyDatabase(databasePath).close();
const server = createServer({ requestTimeout: 5000, headersTimeout: 5000 }, async (req, res) => {
  const send = (status, data) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(data));
  };
  if (req.method !== "POST" || req.url !== "/query") {
    send(404, { status: "error", error: "Unknown endpoint" });
    return;
  }
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) throw new Error("Request too large");
      chunks.push(chunk);
    }
    const query = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const db = openReadOnlyDatabase(databasePath);
    try {
      db.pragma("busy_timeout = 2000");
      send(200, queryBudgetBuddy(db, query));
    } finally {
      db.close();
    }
  } catch (error) {
    send(400, { status: "error", error: error instanceof Error ? error.message : "Query failed" });
  }
});
server.listen(socket, () => chmodSync(socket, 0o660));
