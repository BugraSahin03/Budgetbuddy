#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const LABELS = [
  { name: "status:todo", color: "C2E0C6", description: "Noch offen" },
  { name: "status:doing", color: "FBCA04", description: "In Arbeit" },
  { name: "status:review", color: "1D76DB", description: "Fertig umgesetzt, Review offen" },
  { name: "status:ready-to-merge", color: "0E8A16", description: "Review freigegeben, bereit zum Merge" },
  { name: "status:blocked", color: "D73A4A", description: "Blockiert" },
  { name: "status:done", color: "0E8A16", description: "Erledigt" },
  { name: "priority:p0", color: "B60205", description: "Notwendig fuer ersten nutzbaren MVP" },
  { name: "priority:p1", color: "D93F0B", description: "Wichtig kurz nach MVP" },
  { name: "priority:p2", color: "FBCA04", description: "Spaeterer Ausbau" },
  { name: "type:feature", color: "5319E7", description: "Feature- oder Umsetzungsticket" },
  { name: "type:clarification", color: "0052CC", description: "Offene fachliche Klaerung" },
  { name: "source:backlog-migration", color: "BFDADC", description: "Aus docs/backlog.md migriert" },
];

const MILESTONES = [
  "MVP 0: Fundament",
  "MVP 1: Manuelle Nutzung",
  "MVP 2: Import",
  "MVP 3: Auswertungen",
  "MVP 4: Betrieb und Sicherheit",
];

const STATUS_TO_LABEL = {
  todo: "status:todo",
  doing: "status:doing",
  done: "status:done",
  blocked: "status:blocked",
};

const PRIORITY_TO_LABEL = {
  P0: "priority:p0",
  P1: "priority:p1",
  P2: "priority:p2",
};

const STATUS_LABELS = new Set([
  "status:todo",
  "status:doing",
  "status:review",
  "status:ready-to-merge",
  "status:blocked",
  "status:done",
]);

const MANAGED_LABELS = new Set([
  ...STATUS_LABELS,
  "priority:p0",
  "priority:p1",
  "priority:p2",
  "type:feature",
  "type:clarification",
  "source:backlog-migration",
]);

function parseArgs(argv) {
  const args = {
    mode: null,
    repo: null,
    source: "docs/backlog.md",
    branch: "main",
    skipBranchProtection: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      args.mode = "dry-run";
      continue;
    }
    if (arg === "--execute") {
      args.mode = "execute";
      continue;
    }
    if (arg === "--verify") {
      args.mode = "verify";
      continue;
    }
    if (arg === "--repo") {
      args.repo = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--source") {
      args.source = argv[i + 1] ?? args.source;
      i += 1;
      continue;
    }
    if (arg === "--branch") {
      args.branch = argv[i + 1] ?? args.branch;
      i += 1;
      continue;
    }
    if (arg === "--skip-branch-protection") {
      args.skipBranchProtection = true;
      continue;
    }

    throw new Error(`Unbekanntes Argument: ${arg}`);
  }

  if (!args.mode) {
    throw new Error("Bitte genau einen Modus setzen: --dry-run | --execute | --verify");
  }

  if (!args.repo) {
    throw new Error("Bitte --repo owner/name angeben, z. B. --repo BugraSahin03/Budgetbuddy");
  }

  return args;
}

function normalizeWhitespace(input) {
  return input.replace(/\r\n/g, "\n").trim();
}

function getLineValue(line, key) {
  if (!line.startsWith(`${key}:`)) {
    return null;
  }
  const raw = line.slice(key.length + 1).trim();
  return raw.replace(/^`/, "").replace(/`$/, "").trim();
}

function parseBulletLines(lines) {
  const items = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      items.push(trimmed.slice(2).trim());
    }
  }
  return items;
}

function parseBacklog(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const tickets = [];
  const clarifications = [];

  let currentMvp = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## MVP ")) {
      currentMvp = line.replace(/^##\s+/, "").trim();
      i += 1;
      continue;
    }

    if (line.startsWith("## Offene fachliche Klaerungen")) {
      i += 1;
      while (i < lines.length) {
        const current = lines[i].trim();
        if (current.startsWith("## ")) {
          break;
        }
        if (current.startsWith("- ")) {
          clarifications.push(current.slice(2).trim());
        }
        i += 1;
      }
      continue;
    }

    const ticketMatch = line.match(/^###\s+(FIN-\d{3})\s+(.+)$/);
    if (!ticketMatch) {
      i += 1;
      continue;
    }

    const finId = ticketMatch[1];
    const ticketTitle = ticketMatch[2].trim();

    i += 1;
    const block = [];
    while (i < lines.length && !lines[i].startsWith("### ") && !lines[i].startsWith("## ")) {
      block.push(lines[i]);
      i += 1;
    }

    let status = null;
    let priority = null;
    let review = null;
    let goal = null;
    const acceptanceLines = [];
    const notesLines = [];

    let section = null;

    for (const rawLine of block) {
      const trimmedLine = rawLine.trim();

      const statusValue = getLineValue(trimmedLine, "Status");
      if (statusValue) {
        status = statusValue;
        continue;
      }

      const priorityValue = getLineValue(trimmedLine, "Prioritaet");
      if (priorityValue) {
        priority = priorityValue;
        continue;
      }

      const reviewValue = getLineValue(trimmedLine, "Review");
      if (reviewValue) {
        review = reviewValue;
        continue;
      }

      if (trimmedLine.startsWith("Ziel:")) {
        goal = trimmedLine.slice("Ziel:".length).trim();
        section = null;
        continue;
      }

      if (trimmedLine === "Akzeptanzkriterien:") {
        section = "acceptance";
        continue;
      }

      if (trimmedLine === "Notizen:") {
        section = "notes";
        continue;
      }

      if (section === "acceptance") {
        acceptanceLines.push(rawLine);
      } else if (section === "notes") {
        notesLines.push(rawLine);
      }
    }

    if (!status || !priority) {
      throw new Error(`Ticket ${finId} konnte nicht geparst werden (Status/Prioritaet fehlt)`);
    }

    tickets.push({
      finId,
      title: ticketTitle,
      status,
      priority,
      review,
      milestone: currentMvp,
      goal,
      acceptanceCriteria: parseBulletLines(acceptanceLines),
      notes: parseBulletLines(notesLines),
    });
  }

  return { tickets, clarifications };
}

function buildFeatureIssueBody(ticket, sourcePath) {
  const acceptance = ticket.acceptanceCriteria.length
    ? ticket.acceptanceCriteria.map((item) => `- ${item}`).join("\n")
    : "- (nicht spezifiziert)";

  const notes = ticket.notes.length
    ? ticket.notes.map((item) => `- ${item}`).join("\n")
    : "- (keine)";

  return normalizeWhitespace(`
Migration-Source: ${sourcePath}
Migration-Source-ID: ${ticket.finId}

FIN-ID: ${ticket.finId}
MVP-Phase: ${ticket.milestone ?? "(keine)"}
Legacy-Status: ${ticket.status}
Legacy-Prioritaet: ${ticket.priority}
Legacy-Review: ${ticket.review ?? "(keiner)"}

## Ziel
${ticket.goal ?? "(nicht spezifiziert)"}

## Akzeptanzkriterien
${acceptance}

## Notizen
${notes}
`);
}

function buildClarificationIssueBody({ id, text, sourcePath }) {
  return normalizeWhitespace(`
Migration-Source: ${sourcePath}
Migration-Source-ID: ${id}

## Offene fachliche Klaerung
- ${text}

## Erwartetes Ergebnis
- Fachliche Entscheidung dokumentieren
- Bei Bedarf Folge-Issue(s) anlegen
- Relevante Doku (docs/project-briefing.md, docs/domain-model.md, docs/decision-log.md) aktualisieren
`);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",").map((part) => part.trim());
  for (const part of parts) {
    const match = part.match(/^<([^>]+)>;\s*rel="([^"]+)"$/);
    if (!match) continue;
    if (match[2] === "next") return match[1];
  }
  return null;
}

async function githubRequest({ token, method = "GET", url, body = null }) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? `HTTP ${response.status}`;
    const details = data?.errors ? ` | ${JSON.stringify(data.errors)}` : "";
    throw new Error(`${method} ${url} fehlgeschlagen: ${message}${details}`);
  }

  return {
    data,
    headers: response.headers,
  };
}

async function paginateGithub({ token, url }) {
  const all = [];
  let nextUrl = url;

  while (nextUrl) {
    const { data, headers } = await githubRequest({ token, method: "GET", url: nextUrl });
    if (Array.isArray(data)) {
      all.push(...data);
    } else {
      throw new Error(`Erwartetes Array bei ${nextUrl}`);
    }
    nextUrl = parseNextLink(headers.get("link"));
  }

  return all;
}

async function ensureLabels({ token, repo }) {
  const [owner, name] = repo.split("/");
  const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

  const existing = await paginateGithub({
    token,
    url: `${baseUrl}/labels?per_page=100`,
  });

  const existingByName = new Map(existing.map((label) => [label.name, label]));

  for (const label of LABELS) {
    const current = existingByName.get(label.name);
    if (!current) {
      await githubRequest({
        token,
        method: "POST",
        url: `${baseUrl}/labels`,
        body: label,
      });
      console.log(`+ Label erstellt: ${label.name}`);
      continue;
    }

    const needsUpdate =
      current.color?.toLowerCase() !== label.color.toLowerCase() ||
      (current.description ?? "") !== label.description;

    if (needsUpdate) {
      await githubRequest({
        token,
        method: "PATCH",
        url: `${baseUrl}/labels/${encodeURIComponent(label.name)}`,
        body: {
          new_name: label.name,
          color: label.color,
          description: label.description,
        },
      });
      console.log(`~ Label aktualisiert: ${label.name}`);
    }
  }
}

async function ensureMilestones({ token, repo }) {
  const [owner, name] = repo.split("/");
  const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

  const existing = await paginateGithub({
    token,
    url: `${baseUrl}/milestones?state=all&per_page=100`,
  });

  const byTitle = new Map(existing.map((milestone) => [milestone.title, milestone]));

  for (const title of MILESTONES) {
    if (byTitle.has(title)) {
      continue;
    }

    const { data } = await githubRequest({
      token,
      method: "POST",
      url: `${baseUrl}/milestones`,
      body: {
        title,
      },
    });
    byTitle.set(title, data);
    console.log(`+ Milestone erstellt: ${title}`);
  }

  return byTitle;
}

async function fetchMilestonesMap({ token, repo }) {
  const [owner, name] = repo.split("/");
  const existing = await paginateGithub({
    token,
    url: `https://api.github.com/repos/${owner}/${name}/milestones?state=all&per_page=100`,
  });
  return new Map(existing.map((milestone) => [milestone.title, milestone]));
}

async function fetchAllIssues({ token, repo }) {
  const [owner, name] = repo.split("/");
  const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

  const issues = await paginateGithub({
    token,
    url: `${baseUrl}/issues?state=all&per_page=100`,
  });

  return issues.filter((issue) => !Object.prototype.hasOwnProperty.call(issue, "pull_request"));
}

function extractFinIdFromTitle(title) {
  const match = title.match(/^\[(FIN-\d{3})\]\s+/);
  return match ? match[1] : null;
}

function extractMigrationSourceId(issue) {
  const body = issue.body ?? "";
  const match = body.match(/^Migration-Source-ID:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function labelNames(issue) {
  return (issue.labels ?? []).map((label) => (typeof label === "string" ? label : label.name));
}

function arraysEqualAsSets(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const value of setA) {
    if (!setB.has(value)) return false;
  }
  return true;
}

function withManagedLabels(existingLabels, desiredManagedLabels) {
  const remaining = existingLabels.filter((name) => !MANAGED_LABELS.has(name));
  return [...new Set([...remaining, ...desiredManagedLabels])];
}

function computeDesiredFeature(ticket, sourcePath, milestonesByTitle) {
  const statusLabel = STATUS_TO_LABEL[ticket.status];
  const priorityLabel = PRIORITY_TO_LABEL[ticket.priority];
  if (!statusLabel) {
    throw new Error(`Unbekannter Status bei ${ticket.finId}: ${ticket.status}`);
  }
  if (!priorityLabel) {
    throw new Error(`Unbekannte Prioritaet bei ${ticket.finId}: ${ticket.priority}`);
  }

  const milestoneNumber = ticket.milestone ? milestonesByTitle.get(ticket.milestone)?.number ?? null : null;

  return {
    sourceId: ticket.finId,
    title: `[${ticket.finId}] ${ticket.title}`,
    body: buildFeatureIssueBody(ticket, sourcePath),
    labels: [statusLabel, priorityLabel, "type:feature", "source:backlog-migration"],
    state: ticket.status === "done" ? "closed" : "open",
    milestoneNumber,
  };
}

function computeDesiredClarification({ id, text, sourcePath }) {
  return {
    sourceId: id,
    title: `[KLAERUNG] ${text}`,
    body: buildClarificationIssueBody({ id, text, sourcePath }),
    labels: ["status:todo", "type:clarification", "source:backlog-migration"],
    state: "open",
    milestoneNumber: null,
  };
}

async function upsertIssue({ token, repo, issue, desired }) {
  const [owner, name] = repo.split("/");
  const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

  const existingLabels = labelNames(issue);
  const uniqueDesiredLabels = withManagedLabels(existingLabels, desired.labels);

  const needsPatch =
    issue.title !== desired.title ||
    (issue.body ?? "") !== desired.body ||
    !arraysEqualAsSets(existingLabels, uniqueDesiredLabels) ||
    (issue.milestone?.number ?? null) !== desired.milestoneNumber;

  if (needsPatch) {
    await githubRequest({
      token,
      method: "PATCH",
      url: `${baseUrl}/issues/${issue.number}`,
      body: {
        title: desired.title,
        body: desired.body,
        labels: uniqueDesiredLabels,
        milestone: desired.milestoneNumber,
      },
    });
    console.log(`~ Issue aktualisiert: #${issue.number} ${desired.sourceId}`);
  }

  const stateMismatch = issue.state !== desired.state;
  if (stateMismatch) {
    await githubRequest({
      token,
      method: "PATCH",
      url: `${baseUrl}/issues/${issue.number}`,
      body: {
        state: desired.state,
      },
    });
    console.log(`~ Issue-Status aktualisiert: #${issue.number} -> ${desired.state}`);
  }
}

async function createIssue({ token, repo, desired }) {
  const [owner, name] = repo.split("/");
  const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

  const { data } = await githubRequest({
    token,
    method: "POST",
    url: `${baseUrl}/issues`,
    body: {
      title: desired.title,
      body: desired.body,
      labels: desired.labels,
      milestone: desired.milestoneNumber,
    },
  });

  console.log(`+ Issue erstellt: #${data.number} ${desired.sourceId}`);

  if (desired.state === "closed") {
    await githubRequest({
      token,
      method: "PATCH",
      url: `${baseUrl}/issues/${data.number}`,
      body: {
        state: "closed",
      },
    });
    console.log(`~ Issue geschlossen: #${data.number}`);
  }
}

async function protectMainBranch({ token, repo, branch }) {
  const [owner, name] = repo.split("/");
  const url = `https://api.github.com/repos/${owner}/${name}/branches/${encodeURIComponent(branch)}/protection`;

  await githubRequest({
    token,
    method: "PUT",
    url,
    body: {
      required_status_checks: {
        strict: true,
        contexts: ["quality"],
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        required_approving_review_count: 1,
      },
      restrictions: null,
    },
  });

  console.log(`+ Branch Protection gesetzt fuer ${branch}`);
}

async function runDryRun(parsed) {
  const doneCount = parsed.tickets.filter((ticket) => ticket.status === "done").length;

  console.log("Dry Run Summary");
  console.log(`- FIN-Tickets: ${parsed.tickets.length}`);
  console.log(`- davon done (geschlossen): ${doneCount}`);
  console.log(`- davon offen: ${parsed.tickets.length - doneCount}`);
  console.log(`- Fachliche Klaerungen: ${parsed.clarifications.length}`);

  console.log("\nBeispiel-Branch-Slugs:");
  for (const ticket of parsed.tickets.slice(0, 3)) {
    const dummyNumber = Number.parseInt(ticket.finId.slice(4), 10);
    console.log(`- issue/${dummyNumber}-fin-${slugify(ticket.title)}`);
  }
}

async function runExecute({ token, repo, sourcePath, parsed, branch, skipBranchProtection }) {
  await ensureLabels({ token, repo });
  const milestonesByTitle = await ensureMilestones({ token, repo });

  const issues = await fetchAllIssues({ token, repo });
  const finById = new Map();
  const clarificationById = new Map();

  for (const issue of issues) {
    const finId = extractFinIdFromTitle(issue.title ?? "");
    if (finId) {
      if (!finById.has(finId)) {
        finById.set(finId, issue);
      }
      continue;
    }

    const sourceId = extractMigrationSourceId(issue);
    if (sourceId?.startsWith("CLAR-")) {
      clarificationById.set(sourceId, issue);
    }
  }

  for (const ticket of parsed.tickets) {
    const desired = computeDesiredFeature(ticket, sourcePath, milestonesByTitle);
    const existing = finById.get(ticket.finId);

    if (existing) {
      await upsertIssue({ token, repo, issue: existing, desired });
    } else {
      await createIssue({ token, repo, desired });
    }
  }

  for (let i = 0; i < parsed.clarifications.length; i += 1) {
    const id = `CLAR-${String(i + 1).padStart(3, "0")}`;
    const desired = computeDesiredClarification({
      id,
      text: parsed.clarifications[i],
      sourcePath,
    });
    const existing = clarificationById.get(id);

    if (existing) {
      await upsertIssue({ token, repo, issue: existing, desired });
    } else {
      await createIssue({ token, repo, desired });
    }
  }

  if (!skipBranchProtection) {
    try {
      await protectMainBranch({ token, repo, branch });
    } catch (error) {
      console.warn(`! Branch Protection konnte nicht gesetzt werden: ${error.message}`);
      console.warn("! Fuehre den Befehl mit einem Admin-Token erneut aus oder setze die Regel manuell in GitHub.");
    }
  }

  console.log("Execute abgeschlossen.");
}

function issueMilestoneTitle(issue) {
  return issue.milestone?.title ?? null;
}

async function runVerify({ token, repo, sourcePath, parsed }) {
  const milestones = await fetchMilestonesMap({ token, repo });
  const issues = await fetchAllIssues({ token, repo });

  const problems = [];

  const labelsFound = new Set();
  const [owner, name] = repo.split("/");
  const labelData = await paginateGithub({
    token,
    url: `https://api.github.com/repos/${owner}/${name}/labels?per_page=100`,
  });
  for (const label of labelData) {
    labelsFound.add(label.name);
  }

  for (const label of LABELS) {
    if (!labelsFound.has(label.name)) {
      problems.push(`Label fehlt: ${label.name}`);
    }
  }

  for (const milestoneTitle of MILESTONES) {
    if (!milestones.has(milestoneTitle)) {
      problems.push(`Milestone fehlt: ${milestoneTitle}`);
    }
  }

  const finIssues = new Map();
  const finDuplicates = new Set();
  const clarifications = new Map();

  for (const issue of issues) {
    const finId = extractFinIdFromTitle(issue.title ?? "");
    if (finId) {
      if (finIssues.has(finId)) {
        finDuplicates.add(finId);
      } else {
        finIssues.set(finId, issue);
      }
      continue;
    }

    const sourceId = extractMigrationSourceId(issue);
    if (sourceId?.startsWith("CLAR-")) {
      clarifications.set(sourceId, issue);
    }
  }

  if (finIssues.size !== parsed.tickets.length) {
    problems.push(`FIN-Issue-Anzahl passt nicht: erwartet ${parsed.tickets.length}, gefunden ${finIssues.size}`);
  }

  if (finDuplicates.size > 0) {
    problems.push(`Doppelte FIN-Issues gefunden: ${[...finDuplicates].join(", ")}`);
  }

  const expectedClosed = new Set(parsed.tickets.filter((ticket) => ticket.status === "done").map((ticket) => ticket.finId));

  for (const ticket of parsed.tickets) {
    const issue = finIssues.get(ticket.finId);
    if (!issue) {
      problems.push(`Fehlendes FIN-Issue: ${ticket.finId}`);
      continue;
    }

    const labels = labelNames(issue);
    const expectedStatus = STATUS_TO_LABEL[ticket.status];
    const expectedPriority = PRIORITY_TO_LABEL[ticket.priority];

    if (!labels.includes(expectedStatus)) {
      problems.push(`${ticket.finId}: Statuslabel fehlt (${expectedStatus})`);
    }
    if (!labels.includes(expectedPriority)) {
      problems.push(`${ticket.finId}: Prioritaetslabel fehlt (${expectedPriority})`);
    }
    if (!labels.includes("type:feature")) {
      problems.push(`${ticket.finId}: type:feature fehlt`);
    }
    if (!labels.includes("source:backlog-migration")) {
      problems.push(`${ticket.finId}: source:backlog-migration fehlt`);
    }

    if (ticket.milestone && issueMilestoneTitle(issue) !== ticket.milestone) {
      problems.push(`${ticket.finId}: Milestone passt nicht (erwartet ${ticket.milestone}, gefunden ${issueMilestoneTitle(issue) ?? "none"})`);
    }

    const shouldBeClosed = expectedClosed.has(ticket.finId);
    if (shouldBeClosed && issue.state !== "closed") {
      problems.push(`${ticket.finId}: sollte geschlossen sein`);
    }
    if (!shouldBeClosed && issue.state !== "open") {
      problems.push(`${ticket.finId}: sollte offen sein`);
    }
  }

  if (clarifications.size !== parsed.clarifications.length) {
    problems.push(
      `Klaerungs-Issue-Anzahl passt nicht: erwartet ${parsed.clarifications.length}, gefunden ${clarifications.size}`,
    );
  }

  for (let i = 0; i < parsed.clarifications.length; i += 1) {
    const id = `CLAR-${String(i + 1).padStart(3, "0")}`;
    const issue = clarifications.get(id);
    if (!issue) {
      problems.push(`Fehlendes Klaerungs-Issue: ${id}`);
      continue;
    }

    const labels = labelNames(issue);
    if (!labels.includes("type:clarification")) {
      problems.push(`${id}: type:clarification fehlt`);
    }
    if (!labels.includes("status:todo")) {
      problems.push(`${id}: status:todo fehlt`);
    }
    if (!labels.includes("source:backlog-migration")) {
      problems.push(`${id}: source:backlog-migration fehlt`);
    }
    if (issue.state !== "open") {
      problems.push(`${id}: sollte offen sein`);
    }
  }

  if (problems.length > 0) {
    console.error("Verifikation fehlgeschlagen:");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    throw new Error("Verify fehlgeschlagen");
  }

  console.log("Verifikation erfolgreich.");
  console.log(`- FIN-Issues: ${parsed.tickets.length}`);
  console.log(`- Klaerungs-Issues: ${parsed.clarifications.length}`);
  console.log(`- Quelle: ${sourcePath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source);
  const sourceContent = await fs.readFile(sourcePath, "utf8");
  const parsed = parseBacklog(sourceContent);

  if (args.mode === "dry-run") {
    await runDryRun(parsed);
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN fehlt. Bitte als Environment-Variable setzen.");
  }

  if (args.mode === "execute") {
    await runExecute({
      token,
      repo: args.repo,
      sourcePath: args.source,
      parsed,
      branch: args.branch,
      skipBranchProtection: args.skipBranchProtection,
    });
    return;
  }

  if (args.mode === "verify") {
    await runVerify({
      token,
      repo: args.repo,
      sourcePath: args.source,
      parsed,
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
