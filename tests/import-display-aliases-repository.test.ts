import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations } from "@/src/db/schema";

let db: Database.Database;

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/src/db/client", () => ({
  getDb: () => db,
}));

const aliases = await import("@/src/settings/import-display-aliases/repository");
const importRules = await import("@/src/import-rules/repository");

describe("FIN-059 import display aliases repository", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, updates and deletes aliases independently from import rules", () => {
    aliases.createImportDisplayAlias({ pattern: "AMZN", displayName: "Amazon" });
    aliases.createImportDisplayAlias({ pattern: "IKEA 322", displayName: "IKEA" });

    const listed = aliases.listImportDisplayAliases();
    expect(listed.map((alias) => alias.displayName)).toEqual(["IKEA", "Amazon"]);

    aliases.updateImportDisplayAlias(listed[1].id, {
      pattern: "AMZN Mktp",
      displayName: "Amazon Marketplace",
    });

    expect(
      aliases.listImportDisplayAliases().find((alias) => alias.id === listed[1].id),
    ).toMatchObject({ pattern: "AMZN Mktp", displayName: "Amazon Marketplace" });

    aliases.deleteImportDisplayAlias(listed[0].id);
    expect(aliases.listImportDisplayAliases()).toHaveLength(1);

    expect(importRules.listImportRules().some((rule) => rule.pattern === "AMZN Mktp")).toBe(false);
  });

  it("rejects duplicate alias patterns case-insensitively", () => {
    aliases.createImportDisplayAlias({ pattern: "AMZN", displayName: "Amazon" });

    expect(() =>
      aliases.createImportDisplayAlias({ pattern: "amzn", displayName: "Amazon 2" }),
    ).toThrow("existiert bereits");
  });
});
