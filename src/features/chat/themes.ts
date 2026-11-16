import type { CSSProperties } from "react";
import {
  BOTANICAL,
  CITY,
  CONSTELLATIONS,
  FIZZ,
  GRAIN,
  LETTERS,
  MEMPHIS,
  NEON,
  PAPER_GRAIN,
  POLKA,
  RAIN,
  RISO,
  SKY,
  TERRAZZO,
  TOPO,
  TWO_CITIES,
  VELVET,
  flat,
} from "./wallpapers/patterns";

export type BubbleGroup = "Solid" | "Outline" | "Paper" | "Duotone" | "Gradient";
export const BUBBLE_GROUPS: BubbleGroup[] = ["Solid", "Outline", "Paper", "Duotone", "Gradient"];

interface BubbleTheme {
  label: string;
  group: BubbleGroup;
  /** Your bubble: CSS background, text colour, optional border. */
  bg: string;
  fg: string;
  border?: string;
  /** Their bubble, for duotones. Defaults to the plain plum bubble. */
  inBg?: string;
  inFg?: string;
  inBorder?: string;
  /** Solid colours behind `bg`, used to check text contrast (AA). */
  tones: string[];
}

const SURFACE_1 = "#1B1318";
const outline = (label: string, c: string, fg: string): BubbleTheme => ({
  label,
  group: "Outline",
  bg: SURFACE_1,
  fg,
  border: `1.5px solid ${c}`,
  tones: [SURFACE_1],
});
const paper = (label: string, c: string, fg: string, edge: string): BubbleTheme => ({
  label,
  group: "Paper",
  bg: `${PAPER_GRAIN}, ${c}`,
  fg,
  border: `1px solid ${edge}`,
  tones: [c],
});
const duo = (
  label: string,
  out: string,
  outFg: string,
  inBg: string,
  inFg: string,
  inEdge: string,
): BubbleTheme => ({
  label,
  group: "Duotone",
  bg: out,
  fg: outFg,
  inBg,
  inFg,
  inBorder: `1px solid ${inEdge}`,
  tones: [out],
});

/** Shared chat themes: your bubble colour, the text on it, and sometimes theirs too. */
export const CHAT_THEMES = {
  clink: {
    label: "Clink",
    group: "Solid",
    bg: "var(--surface-3)",
    fg: "var(--text)",
    tones: ["#31232C"],
  },
  rouge: { label: "Rouge", group: "Solid", bg: "#FF4F7B", fg: "#1A0A10", tones: ["#FF4F7B"] },
  champagne: {
    label: "Champagne",
    group: "Solid",
    bg: "#FFD08A",
    fg: "#2A1A08",
    tones: ["#FFD08A"],
  },
  lilac: { label: "Lilac", group: "Solid", bg: "#B9A4FF", fg: "#170F2E", tones: ["#B9A4FF"] },
  mint: { label: "Mint", group: "Solid", bg: "#5ED3B3", fg: "#062019", tones: ["#5ED3B3"] },
  ink: { label: "Ink", group: "Solid", bg: "#22304F", fg: "#E6ECFF", tones: ["#22304F"] },
  wine: { label: "Wine", group: "Solid", bg: "#6E1F36", fg: "#FFE3EA", tones: ["#6E1F36"] },
  mono: { label: "Mono", group: "Solid", bg: "#FBF3F6", fg: "#1A0A10", tones: ["#FBF3F6"] },

  line_rouge: outline("Rouge line", "#FF4F7B", "#FFC2D1"),
  line_gold: outline("Gold line", "#FFD08A", "#FFE2B5"),
  line_lilac: outline("Lilac line", "#B9A4FF", "#DDD3FF"),
  line_mint: outline("Mint line", "#5ED3B3", "#B5F0DF"),

  letter: paper("Letter", "#F4ECDF", "#2B2118", "#D9C9AE"),
  kraft: paper("Kraft", "#CDAE84", "#24170A", "#B3946A"),
  blush: paper("Blush card", "#FBE3E8", "#3A0F1C", "#E8C2CB"),

  duo_rouge: duo("Rouge and lilac", "#FF4F7B", "#1A0A10", "#2B2342", "#E2DAFF", "#3F3560"),
  duo_gold: duo("Gold and plum", "#FFD08A", "#2A1A08", "#2D1F29", "#FFE2BD", "#46323F"),
  duo_mint: duo("Mint and ink", "#5ED3B3", "#062019", "#172531", "#D3EEF7", "#26394A"),
  duo_ember: duo("Ember and smoke", "#FF5A3C", "#1A0A10", "#2A1D1B", "#FFD9CC", "#3F2C28"),

  // Saved keys from the first release. Text is dark where white failed AA.
  sunset: {
    label: "Sunset",
    group: "Gradient",
    bg: "linear-gradient(135deg,#ff7a59,#e2457a)",
    fg: "#1A0A10",
    tones: ["#ff7a59", "#e2457a"],
  },
  ocean: {
    label: "Ocean",
    group: "Gradient",
    bg: "linear-gradient(135deg,#2f80ed,#36c2c9)",
    fg: "#06121F",
    tones: ["#2f80ed", "#36c2c9"],
  },
  forest: {
    label: "Forest",
    group: "Gradient",
    bg: "linear-gradient(135deg,#1f9d6a,#7bc96f)",
    fg: "#04150D",
    tones: ["#1f9d6a", "#7bc96f"],
  },
  berry: {
    label: "Berry",
    group: "Gradient",
    bg: "linear-gradient(135deg,#c77dff,#ff4f7b)",
    fg: "#1A0A10",
    tones: ["#c77dff", "#ff4f7b"],
  },
  candy: {
    label: "Candy",
    group: "Gradient",
    bg: "linear-gradient(135deg,#ff9ecd,#ffd28a)",
    fg: "#2a1a22",
    tones: ["#ff9ecd", "#ffd28a"],
  },
  midnight: {
    label: "Midnight",
    group: "Gradient",
    bg: "linear-gradient(135deg,#232a6b,#5b3fb5)",
    fg: "#FFFFFF",
    tones: ["#232a6b", "#5b3fb5"],
  },
} satisfies Record<string, BubbleTheme>;
export type ChatTheme = keyof typeof CHAT_THEMES;
export const CHAT_THEME_KEYS = Object.keys(CHAT_THEMES) as [ChatTheme, ...ChatTheme[]];

/** CSS variables the chat list (and the preview) read to paint bubbles. */
export function bubbleVars(k: ChatTheme): CSSProperties {
  const t: BubbleTheme = CHAT_THEMES[k];
  return {
    "--bubble-out": t.bg,
    "--bubble-out-fg": t.fg,
    "--bubble-out-border": t.border ?? "1px solid transparent",
    "--bubble-in": t.inBg ?? "var(--surface-1)",
    "--bubble-in-fg": t.inFg ?? "var(--text)",
    "--bubble-in-border": t.inBorder ?? "1px solid var(--line)",
  } as CSSProperties;
}

export type WallpaperGroup = "Simple" | "Night" | "Romance" | "Pattern";
export const WALLPAPER_GROUPS: WallpaperGroup[] = ["Simple", "Night", "Romance", "Pattern"];

interface Layer {
  img: string;
  /** Tile size in px (scaled for previews) or a CSS keyword size. */
  size?: [number, number] | string;
  pos?: string;
  repeat?: string;
}
interface WallpaperDef {
  label: string;
  group: WallpaperGroup | null;
  /** Top layer first. */
  layers: Layer[];
}

const base = (c: string): Layer => ({ img: flat(c) });
const night = (top: string, bottom = "#120C10"): Layer => ({
  img: `linear-gradient(180deg, ${top}, ${bottom})`,
});

/** Wallpapers behind the conversation. Pure CSS and inline SVG, nothing to download. */
export const WALLPAPERS = {
  none: { label: "None", group: "Simple", layers: [] },
  dots: {
    label: "Dots",
    group: "Simple",
    layers: [
      { img: "radial-gradient(rgba(251,243,246,.08) 1.2px, transparent 1.4px)", size: [18, 18] },
    ],
  },
  grain: {
    label: "Film grain",
    group: "Simple",
    layers: [{ img: GRAIN, size: [180, 180] }, base("#15100F")],
  },
  velvet: {
    label: "Velvet",
    group: "Simple",
    layers: [{ img: VELVET, size: [220, 220] }, night("#24101A", "#12080D")],
  },
  waves: {
    label: "Waves",
    group: "Simple",
    layers: [
      {
        img: "repeating-linear-gradient(135deg, rgba(255,79,123,.05) 0 14px, transparent 14px 28px)",
      },
    ],
  },

  stars: {
    label: "Stars",
    group: "Night",
    layers: [
      {
        img: "radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,.35), transparent)",
        size: [180, 140],
      },
      {
        img: "radial-gradient(1px 1px at 70px 80px, rgba(255,255,255,.25), transparent)",
        size: [180, 140],
      },
      {
        img: "radial-gradient(1.5px 1.5px at 120px 20px, rgba(255,255,255,.3), transparent)",
        size: [180, 140],
      },
      {
        img: "radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,.2), transparent)",
        size: [180, 140],
      },
      { img: "linear-gradient(180deg, #120f1d, #0d0b10)" },
    ],
  },
  constellations: {
    label: "Star map",
    group: "Night",
    layers: [{ img: CONSTELLATIONS, size: [240, 240] }, night("#100D1E")],
  },
  city: {
    label: "City lights",
    group: "Night",
    layers: [
      { img: CITY, size: [360, 170], pos: "left bottom", repeat: "repeat-x" },
      { img: SKY, size: [240, 240] },
      night("#0E0C1C", "#17111C"),
    ],
  },
  two_cities: {
    label: "Skylines",
    group: "Night",
    layers: [
      { img: TWO_CITIES, size: "100% auto", pos: "center bottom", repeat: "no-repeat" },
      { img: SKY, size: [240, 240] },
      night("#0D0B1A", "#16101A"),
    ],
  },
  rain: {
    label: "Rain on glass",
    group: "Night",
    layers: [{ img: RAIN, size: [160, 240] }, night("#0F131B", "#110D12")],
  },
  aurora: {
    label: "Aurora",
    group: "Night",
    layers: [
      { img: "radial-gradient(80% 60% at 0% 0%, rgba(79,209,197,.22), transparent 60%)" },
      { img: "radial-gradient(70% 60% at 100% 30%, rgba(139,124,255,.22), transparent 60%)" },
      { img: "radial-gradient(70% 60% at 30% 100%, rgba(255,79,123,.2), transparent 60%)" },
    ],
  },

  hearts: {
    label: "Hearts",
    group: "Romance",
    layers: [
      {
        img: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cpath d='M28 38s-9-5.6-9-11.2A4.8 4.8 0 0 1 28 24a4.8 4.8 0 0 1 9 2.8C37 32.4 28 38 28 38z' fill='%23FF4F7B' fill-opacity='.10'/%3E%3C/svg%3E\")",
        size: [56, 56],
      },
    ],
  },
  polka: { label: "Polka hearts", group: "Romance", layers: [{ img: POLKA, size: [52, 52] }] },
  letters: {
    label: "Love letters",
    group: "Romance",
    layers: [{ img: LETTERS, size: [300, 220] }, base("#140D12")],
  },
  fizz: {
    label: "Champagne",
    group: "Romance",
    layers: [{ img: FIZZ, size: [140, 240] }, night("#1A1410", "#120C10")],
  },
  neon: {
    label: "Neon sign",
    group: "Romance",
    layers: [{ img: NEON, size: [260, 260] }, base("#0F0A0E")],
  },
  glow: {
    label: "Glow",
    group: "Romance",
    layers: [
      {
        img: "radial-gradient(70% 50% at 20% 10%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)",
      },
      {
        img: "radial-gradient(60% 50% at 90% 90%, color-mix(in oklab, var(--partner-b) 18%, transparent), transparent 70%)",
      },
    ],
  },

  risograph: {
    label: "Risograph",
    group: "Pattern",
    layers: [{ img: GRAIN, size: [180, 180] }, { img: RISO, size: [22, 22] }, base("#17111A")],
  },
  terrazzo: {
    label: "Terrazzo",
    group: "Pattern",
    layers: [{ img: TERRAZZO, size: [180, 180] }, base("#17121A")],
  },
  topo: {
    label: "Topographic",
    group: "Pattern",
    layers: [{ img: TOPO, size: [240, 240] }, base("#12100F")],
  },
  botanical: {
    label: "Botanical",
    group: "Pattern",
    layers: [{ img: BOTANICAL, size: [220, 220] }, base("#0F1311")],
  },
  memphis: {
    label: "Memphis",
    group: "Pattern",
    layers: [{ img: MEMPHIS, size: [200, 200] }, base("#141015")],
  },

  custom: { label: "Your photo", group: null, layers: [] },
} satisfies Record<string, WallpaperDef>;
export type Wallpaper = keyof typeof WALLPAPERS;
export const WALLPAPER_KEYS = Object.keys(WALLPAPERS) as [Wallpaper, ...Wallpaper[]];

/**
 * Background styles for a wallpaper. `scale` shrinks tiled patterns for swatches so a
 * small tile still shows the whole motif.
 */
export function wallpaperStyle(w: Wallpaper, scale = 1): CSSProperties {
  const layers: Layer[] = (WALLPAPERS[w] as WallpaperDef).layers;
  if (!layers.length) return { backgroundImage: "none" };
  const size = (l: Layer) =>
    Array.isArray(l.size) ? `${l.size[0] * scale}px ${l.size[1] * scale}px` : (l.size ?? "auto");
  return {
    backgroundImage: layers.map((l) => l.img).join(", "),
    backgroundSize: layers.map(size).join(", "),
    backgroundPosition: layers.map((l) => l.pos ?? "0 0").join(", "),
    backgroundRepeat: layers.map((l) => l.repeat ?? "repeat").join(", "),
  };
}

/** @deprecated Use wallpaperStyle. Kept for callers that only need the size. */
export const wallpaperSize = (w: Wallpaper) =>
  wallpaperStyle(w).backgroundSize as string | undefined;
