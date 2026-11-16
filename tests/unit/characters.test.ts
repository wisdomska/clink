import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { CHARACTER_NAMES, CHARACTER_POSES } from "@/components/clink/character";

const dir = path.join(process.cwd(), "public/characters");

describe("onboarding characters", () => {
  it("ships an animated loop and a poster for every name and pose, within budget", () => {
    for (const name of CHARACTER_NAMES) {
      for (const pose of CHARACTER_POSES) {
        const loop = path.join(dir, `${name}-${pose}.webp`);
        const poster = path.join(dir, `${name}-${pose}-poster.webp`);
        expect(existsSync(loop), loop).toBe(true);
        expect(existsSync(poster), poster).toBe(true);
        expect(statSync(loop).size).toBeLessThanOrEqual(155 * 1024);
      }
    }
  });

  it("credits the CC0 source", () => {
    expect(existsSync(path.join(dir, "CREDITS.md"))).toBe(true);
  });
});
