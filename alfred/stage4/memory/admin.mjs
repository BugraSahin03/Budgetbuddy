#!/usr/bin/env node

import { DEFAULT_MEMORY_ROOT, PersonalContextStore } from "./store.mjs";

const command = process.argv[2] ?? "verify";
const root = process.env.ALFRED_MEMORY_ROOT ?? DEFAULT_MEMORY_ROOT;
const store = new PersonalContextStore({ root });

if (command === "init") {
  process.stdout.write(`${JSON.stringify({ status: "ok", ...store.initialize() })}\n`);
} else if (command === "render") {
  const current = store.loadStore();
  store.renderMarkdown(current);
  process.stdout.write(
    `${JSON.stringify({ status: "ok", revision: current.revision, rendered: true })}\n`,
  );
} else if (command === "verify") {
  const current = store.loadStore();
  process.stdout.write(
    `${JSON.stringify({
      status: "ok",
      contractVersion: current.contractVersion,
      revision: current.revision,
      activeItemCount: current.items.filter((item) => item.status === "active").length,
      archivedItemCount: current.items.filter((item) => item.status !== "active").length,
      pendingProposalCount: store.pending().length,
      dataSha256: current.integrity.dataSha256,
    })}\n`,
  );
} else {
  throw new Error("Usage: admin.mjs init|verify|render");
}
