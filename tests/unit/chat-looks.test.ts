import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  CHAT_THEMES,
  CHAT_THEME_KEYS,
  WALLPAPERS,
  WALLPAPER_KEYS,
  bubbleVars,
  wallpaperStyle,
} from "@/features/chat/themes";

const VARS: Record<string, string> = {
  "var(--text)": "#FBF3F6",
  "var(--surface-1)": "#1B1318",
  "var(--surface-3)": "#31232C",
};
const hex = (c: string) => VARS[c] ?? c;
function lum(c: string) {
  const n = parseInt(hex(c).slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe("chat looks", () => {
  it("offers plenty of choice and keeps every first-release key", () => {
    expect(CHAT_THEME_KEYS.length).toBeGreaterThanOrEqual(14);
    expect(
      WALLPAPER_KEYS.filter((k) => k !== "none" && k !== "custom").length,
    ).toBeGreaterThanOrEqual(16);
    for (const k of ["clink", "sunset", "ocean", "forest", "berry", "mono", "candy", "midnight"])
      expect(CHAT_THEME_KEYS).toContain(k);
    for (const k of ["none", "glow", "hearts", "stars", "dots", "waves", "aurora", "custom"])
      expect(WALLPAPER_KEYS).toContain(k);
  });

  it("every bubble theme reads at AA on both sides", () => {
    for (const k of CHAT_THEME_KEYS) {
      const t = CHAT_THEMES[k] as { fg: string; tones: string[]; inBg?: string; inFg?: string };
      for (const tone of t.tones)
        expect(contrast(tone, t.fg), `${k} on ${tone}`).toBeGreaterThanOrEqual(4.5);
      if (t.inBg) expect(contrast(t.inBg, t.inFg!), `${k} incoming`).toBeGreaterThanOrEqual(4.5);
      expect(bubbleVars(k)).toHaveProperty("--bubble-out", CHAT_THEMES[k].bg);
    }
  });

  it("wallpapers build valid layered backgrounds", () => {
    for (const k of WALLPAPER_KEYS) {
      const s = wallpaperStyle(k);
      const layers = WALLPAPERS[k].layers.length;
      if (!layers) continue;
      expect(String(s.backgroundSize).split(", ")).toHaveLength(layers);
      expect(String(s.backgroundRepeat).split(", ")).toHaveLength(layers);
    }
    expect(wallpaperStyle("polka", 0.5).backgroundSize).toBe("26px 26px");
  });

  it("the latest migration allows exactly the catalogue keys", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    const files = readdirSync(dir).sort();
    const latest = (col: string) => {
      for (const f of [...files].reverse()) {
        const m = new RegExp(`check \\(${col} in \\(([^)]*)\\)\\)`).exec(
          readFileSync(join(dir, f), "utf8"),
        );
        if (m)
          return m[1]!
            .split(",")
            .map((s) => s.trim().replace(/'/g, ""))
            .sort();
      }
      return [];
    };
    expect(latest("chat_theme")).toEqual([...CHAT_THEME_KEYS].sort());
    expect(latest("chat_wallpaper")).toEqual([...WALLPAPER_KEYS].sort());
  });
});
