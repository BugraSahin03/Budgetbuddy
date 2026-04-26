import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DATABASE_PATH_ENV,
  DEFAULT_DATABASE_DIR,
  DEFAULT_DATABASE_FILE,
  resolveDatabasePath,
} from "@/src/db/config";

describe("resolveDatabasePath", () => {
  it("uses default path when no env override is set", () => {
    const resolved = resolveDatabasePath({});

    expect(resolved).toBe(
      path.resolve(process.cwd(), DEFAULT_DATABASE_DIR, DEFAULT_DATABASE_FILE),
    );
  });

  it("uses env override when configured", () => {
    const resolved = resolveDatabasePath({
      [DATABASE_PATH_ENV]: "./tmp/custom.db",
    });

    expect(resolved).toBe(path.resolve("./tmp/custom.db"));
  });
});

