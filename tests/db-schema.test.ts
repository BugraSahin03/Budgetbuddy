import { describe, expect, it } from "vitest";

import { bootstrapSql } from "@/src/db/schema";

describe("bootstrapSql", () => {
  it("creates app_meta table", () => {
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS app_meta");
  });

  it("seeds schema version marker", () => {
    expect(bootstrapSql).toContain("schema_version");
    expect(bootstrapSql).toContain("fin-001");
  });
});

