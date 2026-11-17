import { describe, expect, it } from "vitest";
import { COUNTDOWN_KINDS, KINDS, boardLine, cleanDetails, isKind } from "@/lib/countdown-kinds";

describe("countdown kinds", () => {
  it("every kind has a label and at least one field", () => {
    for (const k of COUNTDOWN_KINDS) {
      expect(KINDS[k].label.length).toBeGreaterThan(0);
      expect(KINDS[k].fields.length).toBeGreaterThan(0);
    }
    expect(isKind("date")).toBe(true);
    expect(isKind("boarding")).toBe(false);
  });

  it("builds a departure-board line for a visit", () => {
    const d = cleanDetails("visit", { from: " acc ", to: "lhr", ref: "ba078" });
    expect(d).toEqual({ from: "ACC", to: "LHR", ref: "BA078" });
    expect(boardLine("visit", d)).toBe("ACC → LHR · BA078");
    expect(boardLine("visit", { to: "LHR" })).toBe("LHR");
  });

  it("builds plain lines for everything else, and nothing when empty", () => {
    expect(boardLine("trip", { where: "Cape Coast", how: "By road" })).toBe("Cape Coast · By road");
    expect(boardLine("date", { place: "Skybar 25" })).toBe("Skybar 25");
    expect(boardLine("birthday", { whose: "Kofi" })).toBe("Kofi's birthday");
    expect(boardLine("anniversary", {})).toBeNull();
  });

  it("drops fields from other kinds and caps lengths", () => {
    expect(cleanDetails("date", { place: "x", from: "ACC", junk: 1 })).toEqual({ place: "x" });
    expect(cleanDetails("other", { line: "a".repeat(200) }).line).toHaveLength(60);
    expect((boardLine("other", { line: "b".repeat(80) }) ?? "").length).toBeLessThanOrEqual(60);
  });
});
