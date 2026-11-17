import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Brand guard: UI colours come from the palette (CSS variables / Tailwind
 * tokens), never typed in as hex, so accents and After Dark theme every screen.
 * Artwork, canvas drawing and third-party logos are allowed to use literals.
 */
const ALLOWED = [
  "src/components/brand/", // the logo and posters are the source of the colours
  "src/components/clink/brand-logo.tsx", // official third-party logo colours
  "src/components/clink/auth-poster.tsx",
  "src/components/landing/", // illustrated marketing art
  "src/components/fx/", // confetti
  "src/lib/og/", // link-preview images (rendered outside the app's CSS)
  "src/features/chat/media-composer.tsx", // drawing pens and stickers people pick
  "src/features/play/rooms/draw-room.tsx", // drawing pens
  "src/features/play/rooms/turn-rooms.tsx", // canvas export of your story
  "src/features/dark/wheel.tsx", // the matchbook illustration
  "src/features/admin/login.tsx", // poster art
  "src/features/admin/brand.tsx", // the brand sheet labels each token with its hex
  "src/app/layout.tsx", // theme-color meta for the browser chrome
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("brand tokens", () => {
  it("no hard-coded hex colours in UI components", () => {
    const offenders: string[] = [];
    for (const f of files("src")) {
      const rel = f.split(path.sep).join("/");
      if (ALLOWED.some((a) => rel.startsWith(a))) continue;
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/#[0-9a-fA-F]{6}\b/.test(line) && !line.trim().startsWith("//"))
            offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 80)}`);
        });
    }
    expect(offenders, `Use a palette token instead:\n${offenders.join("\n")}`).toEqual([]);
  });
});
