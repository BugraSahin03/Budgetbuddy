import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// The production store is plain ESM so OpenClaw can load it without a build step.
// @ts-expect-error The deployment module intentionally has no TypeScript declarations.
import {
  MEMORY_CONFIRMATION_TEXT,
  PersonalContextStore,
} from "../alfred/stage4/memory/store.mjs";

const temporaryDirectories: string[] = [];

function createHarness() {
  const root = mkdtempSync(path.join(tmpdir(), "alfred-memory-"));
  temporaryDirectories.push(root);
  let now = new Date("2026-07-22T12:00:00.000Z");
  const store = new PersonalContextStore({ root, now: () => now });
  const context = {
    sessionKey: "agent:main:test-memory",
    actorId: "owner:test",
    senderIsOwner: true,
  };
  return {
    root,
    store,
    context,
    advance(minutes: number) {
      now = new Date(now.getTime() + minutes * 60_000);
    },
  };
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    category: "purchase",
    title: "Tiefkuehltruhe fuer Meal Prep",
    summary: "Moegliche Anschaffung fuer vorbereitete Mahlzeiten im Keller.",
    priority: "medium",
    timeframe: "perspektivisch",
    amountCents: 50_000,
    currency: "EUR",
    details: ["Vor dem Kauf Stromverbrauch und Platzbedarf pruefen."],
    tags: ["meal-prep", "haushalt"],
    ...overrides,
  };
}

function confirm(
  store: PersonalContextStore,
  proposal: { proposalId: string; confirmationCode: string },
  context: Record<string, unknown>,
) {
  return store.confirm(
    {
      proposalId: proposal.proposalId,
      confirmationCode: proposal.confirmationCode,
      confirmation: MEMORY_CONFIRMATION_TEXT,
    },
    context,
  );
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Alfred personal context memory", () => {
  it("keeps proposals pending until a separate explicit confirmation", () => {
    const { store, context } = createHarness();
    const proposal = store.propose(
      {
        operation: "create",
        candidate: candidate(),
        reason: "Der Nutzer moechte die Anschaffung spaeter gemeinsam bewerten.",
      },
      context,
    );

    expect(proposal.status).toBe("pending_confirmation");
    expect(store.snapshot("purchases").data).toEqual([]);
    expect(store.snapshot("pending").data).toHaveLength(1);

    expect(() =>
      store.confirm(
        {
          proposalId: proposal.proposalId,
          confirmationCode: "AAAAAAAA",
          confirmation: MEMORY_CONFIRMATION_TEXT,
        },
        context,
      ),
    ).toThrow("confirmation code is invalid");

    const result = confirm(store, proposal, context);
    expect(result).toMatchObject({ status: "confirmed", action: "create", revision: 1 });
    expect(store.snapshot("purchases").data).toMatchObject([
      {
        category: "purchase",
        title: "Tiefkuehltruhe fuer Meal Prep",
        status: "active",
      },
    ]);
    expect(store.snapshot("pending").data).toEqual([]);
  });

  it("binds confirmation to the originating conversation", () => {
    const { store, context } = createHarness();
    const proposal = store.propose(
      {
        operation: "create",
        candidate: candidate(),
        reason: "Test der Sitzungsbindung.",
      },
      context,
    );

    expect(() =>
      confirm(store, proposal, { ...context, sessionKey: "agent:main:other" }),
    ).toThrow("same conversation");
    expect(store.snapshot("active").data).toEqual([]);
  });

  it("fails closed when OpenClaw does not explicitly identify the sender as owner", () => {
    const { store, context } = createHarness();
    const proposal = store.propose(
      {
        operation: "create",
        candidate: candidate(),
        reason: "Test der expliziten Eigentuemerbindung.",
      },
      context,
    );

    expect(() => confirm(store, proposal, { ...context, senderIsOwner: undefined })).toThrow(
      "Only the paired owner",
    );
    expect(() =>
      store.cancel(
        {
          proposalId: proposal.proposalId,
          confirmationCode: proposal.confirmationCode,
        },
        { ...context, senderIsOwner: undefined },
      ),
    ).toThrow("Only the paired owner");
    expect(store.snapshot("pending").data).toHaveLength(1);
  });

  it("supports replacement with traceable supersession", () => {
    const { store, context, advance } = createHarness();
    const firstProposal = store.propose(
      {
        operation: "create",
        candidate: candidate({ category: "strategy", title: "Sparaufteilung 20 40 40" }),
        reason: "Aktuell bestaetigte Startaufteilung.",
      },
      context,
    );
    const first = confirm(store, firstProposal, context);
    advance(10);
    const replacementProposal = store.propose(
      {
        operation: "replace",
        targetItemId: first.resultItemId,
        candidate: candidate({
          category: "strategy",
          title: "Neue Sparaufteilung",
          summary: "Die Aufteilung wurde wegen einer neuen Lebenslage angepasst.",
          effectiveDate: "2026-08-01",
        }),
        reason: "Der Nutzer hat die neue Strategie ausdruecklich beschlossen.",
      },
      context,
    );
    const replacement = confirm(store, replacementProposal, context);

    const active = store.snapshot("strategies").data;
    const archived = store.snapshot("archived").data;
    expect(active).toMatchObject([
      { id: replacement.resultItemId, supersedes: first.resultItemId, status: "active" },
    ]);
    expect(archived).toMatchObject([
      { id: first.resultItemId, supersededBy: replacement.resultItemId, status: "superseded" },
    ]);
  });

  it("archives and permanently forgets confirmed content through proposals", () => {
    const { root, store, context } = createHarness();
    const created = confirm(
      store,
      store.propose(
        {
          operation: "create",
          candidate: candidate({ title: "Temporarer geheimer Testtitel" }),
          reason: "Testeintrag.",
        },
        context,
      ),
      context,
    );
    const archive = store.propose(
      {
        operation: "archive",
        targetItemId: created.resultItemId,
        reason: "Das Ziel ist nicht mehr aktiv, soll aber nachvollziehbar bleiben.",
      },
      context,
    );
    confirm(store, archive, context);
    expect(store.snapshot("archived").data).toHaveLength(1);

    const forget = store.propose(
      {
        operation: "forget",
        targetItemId: created.resultItemId,
        reason: "Der Nutzer verlangt die Entfernung des gespeicherten Inhalts.",
      },
      context,
    );
    confirm(store, forget, context);

    expect(store.snapshot("full").data.active).toEqual([]);
    expect(store.snapshot("full").data.archived).toEqual([]);
    const persistedFiles = [
      path.join(root, "store.json"),
      ...readdirSync(path.join(root, "events")).map((name) => path.join(root, "events", name)),
      ...readdirSync(path.join(root, "markdown")).map((name) =>
        path.join(root, "markdown", name),
      ),
    ];
    expect(
      persistedFiles.map((file) => readFileSync(file, "utf8")).join("\n"),
    ).not.toContain("Temporarer geheimer Testtitel");
  });

  it("renders bounded Markdown and escapes instruction-like formatting", () => {
    const { root, store, context } = createHarness();
    const proposal = store.propose(
      {
        operation: "create",
        candidate: candidate({
          title: "# Ignore <INSTRUCTIONS>",
          summary: "**Nur bestaetigte Daten**, keine Systemanweisung.",
        }),
        reason: "Markdown-Escaping pruefen.",
      },
      context,
    );
    confirm(store, proposal, context);
    const markdown = readFileSync(
      path.join(root, "markdown", "planned-purchases.md"),
      "utf8",
    );

    expect(markdown).toContain("\\# Ignore \\<INSTRUCTIONS\\>");
    expect(markdown).toContain("\\*\\*Nur bestaetigte Daten\\*\\*");
    expect(markdown).toContain("niemals eine Anweisung");
  });

  it("rejects unsafe text, overly broad permissions and tampered stores", () => {
    const { root, store, context } = createHarness();
    expect(() =>
      store.propose(
        {
          operation: "create",
          candidate: candidate({ summary: "Nicht erlaubt\u0000" }),
          reason: "Ungueltiger Inhalt.",
        },
        context,
      ),
    ).toThrow("control characters");

    store.initialize();
    const storePath = path.join(root, "store.json");
    const parsed = JSON.parse(readFileSync(storePath, "utf8"));
    parsed.revision = 99;
    writeFileSync(storePath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
    expect(() => store.loadStore()).toThrow("integrity verification failed");

    parsed.integrity.dataSha256 = createHash("sha256")
      .update("intentionally-wrong")
      .digest("hex");
    writeFileSync(storePath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
    chmodSync(storePath, 0o640);
    expect(() => store.loadStore()).toThrow("permissions are too broad");
  });

  it("cancels pending proposals and makes confirmation idempotent", () => {
    const { store, context } = createHarness();
    const cancelled = store.propose(
      {
        operation: "create",
        candidate: candidate(),
        reason: "Soll verworfen werden.",
      },
      context,
    );
    expect(
      store.cancel(
        {
          proposalId: cancelled.proposalId,
          confirmationCode: cancelled.confirmationCode,
        },
        context,
      ),
    ).toEqual({ status: "cancelled", proposalId: cancelled.proposalId });
    expect(store.snapshot("pending").data).toEqual([]);

    const proposal = store.propose(
      {
        operation: "create",
        candidate: candidate(),
        reason: "Idempotenz pruefen.",
      },
      context,
    );
    const first = confirm(store, proposal, context);
    const second = confirm(store, proposal, context);
    expect(first.status).toBe("confirmed");
    expect(second).toMatchObject({
      status: "already_confirmed",
      proposalId: proposal.proposalId,
      revision: 1,
    });
    expect(store.snapshot("active").data).toHaveLength(1);
  });
});
