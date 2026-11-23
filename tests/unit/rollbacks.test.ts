import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

// From this date on, every migration ships with an undo script and a data note.
const SINCE = "20261122000100";

describe("migration rollbacks", () => {
  const migrations = readdirSync("supabase/migrations").filter(
    (f) => f.endsWith(".sql") && f >= SINCE,
  );
  it("every migration since 22 Nov 2026 has an undo script", () => {
    const missing = migrations.filter((m) => {
      try {
        readFileSync(`supabase/rollbacks/${m.replace(/\.sql$/, ".down.sql")}`);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });
  it("each says what undoing it loses", () => {
    for (const f of readdirSync("supabase/rollbacks"))
      expect(readFileSync(`supabase/rollbacks/${f}`, "utf8"), f).toMatch(/Data: /);
  });
});
