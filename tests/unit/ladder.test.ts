import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
import { generateLadder, distances, COMMON } from "@/lib/server/ladder";
import { ladderProblem, oneApart, parLine } from "@/lib/ladder";

describe("daily ladder", () => {
  it(
    "is the same for everyone on a day, and fair: everyday words, 3 to 5 steps",
    { timeout: 60_000 },
    () => {
      for (let i = 0; i < 60; i++) {
        const day = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
        const a = generateLadder(day);
        expect(generateLadder(day)).toEqual(a);
        expect(COMMON).toContain(a.start);
        expect(COMMON).toContain(a.target);
        expect(a.par).toBeGreaterThanOrEqual(3);
        expect(a.par).toBeLessThanOrEqual(5);
        expect(distances(a.start).get(a.target)).toBe(a.par);
      }
    },
  );
  it("checks every step", () => {
    const yes = () => true;
    expect(oneApart("love", "lose")).toBe(true);
    expect(oneApart("love", "lost")).toBe(false);
    expect(ladderProblem(["love", "lose", "lost"], "love", "lost", yes)).toBeNull();
    expect(ladderProblem(["love", "lost"], "love", "lost", yes)).toMatch(/more than one letter/);
    expect(ladderProblem(["love", "lose"], "love", "lost", yes)).toMatch(/End on LOST/);
    expect(ladderProblem(["love", "lxve", "live"], "love", "live", (w) => w !== "lxve")).toMatch(
      /isn't in the dictionary/,
    );
  });
  it("says how you did against par", () => {
    expect(parLine(4, 4)).toBe("Par. Perfect.");
    expect(parLine(3, 4)).toBe("1 under par!");
    expect(parLine(6, 4)).toBe("2 over par");
  });
});
