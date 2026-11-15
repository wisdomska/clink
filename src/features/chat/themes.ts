/** Shared chat themes: your bubble colour and the text on it. */
export const CHAT_THEMES = {
  clink: {
    label: "Clink",
    bg: "var(--surface-3)",
    fg: "var(--text)",
    swatch: "linear-gradient(135deg,#3a3440,#2a2530)",
  },
  sunset: {
    label: "Sunset",
    bg: "linear-gradient(135deg,#ff7a59,#e2457a)",
    fg: "#fff",
    swatch: "linear-gradient(135deg,#ff7a59,#e2457a)",
  },
  ocean: {
    label: "Ocean",
    bg: "linear-gradient(135deg,#2f80ed,#36c2c9)",
    fg: "#fff",
    swatch: "linear-gradient(135deg,#2f80ed,#36c2c9)",
  },
  forest: {
    label: "Forest",
    bg: "linear-gradient(135deg,#1f9d6a,#7bc96f)",
    fg: "#fff",
    swatch: "linear-gradient(135deg,#1f9d6a,#7bc96f)",
  },
  berry: {
    label: "Berry",
    bg: "linear-gradient(135deg,#b44ce6,#e68af5)",
    fg: "#fff",
    swatch: "linear-gradient(135deg,#b44ce6,#e68af5)",
  },
  candy: {
    label: "Candy",
    bg: "linear-gradient(135deg,#ff9ecd,#ffd28a)",
    fg: "#2a1a22",
    swatch: "linear-gradient(135deg,#ff9ecd,#ffd28a)",
  },
  midnight: {
    label: "Midnight",
    bg: "linear-gradient(135deg,#232a6b,#5b3fb5)",
    fg: "#fff",
    swatch: "linear-gradient(135deg,#232a6b,#5b3fb5)",
  },
  mono: { label: "Mono", bg: "#f4f0f5", fg: "#141216", swatch: "#f4f0f5" },
} as const;
export type ChatTheme = keyof typeof CHAT_THEMES;

/** Wallpapers behind the conversation. Pure CSS, nothing to download. */
export const WALLPAPERS = {
  none: { label: "None", css: "none" },
  glow: {
    label: "Glow",
    css: "radial-gradient(70% 50% at 20% 10%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%), radial-gradient(60% 50% at 90% 90%, color-mix(in oklab, var(--partner-b) 18%, transparent), transparent 70%)",
  },
  hearts: {
    label: "Hearts",
    css: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cpath d='M28 38s-9-5.6-9-11.2A4.8 4.8 0 0 1 28 24a4.8 4.8 0 0 1 9 2.8C37 32.4 28 38 28 38z' fill='%23E68AF5' fill-opacity='.10'/%3E%3C/svg%3E\")",
  },
  stars: {
    label: "Stars",
    css: "radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,.35), transparent), radial-gradient(1px 1px at 70px 80px, rgba(255,255,255,.25), transparent), radial-gradient(1.5px 1.5px at 120px 20px, rgba(255,255,255,.3), transparent), radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,.2), transparent), linear-gradient(180deg, #120f1d, #0d0b10)",
  },
  dots: {
    label: "Dots",
    css: "radial-gradient(rgba(244,240,245,.08) 1.2px, transparent 1.4px)",
  },
  waves: {
    label: "Waves",
    css: "repeating-linear-gradient(135deg, rgba(230,138,245,.05) 0 14px, transparent 14px 28px)",
  },
  aurora: {
    label: "Aurora",
    css: "radial-gradient(80% 60% at 0% 0%, rgba(79,209,197,.22), transparent 60%), radial-gradient(70% 60% at 100% 30%, rgba(139,124,255,.22), transparent 60%), radial-gradient(70% 60% at 30% 100%, rgba(230,138,245,.2), transparent 60%)",
  },
} as const;
export type Wallpaper = keyof typeof WALLPAPERS;
export const wallpaperSize = (w: Wallpaper) =>
  w === "dots"
    ? "18px 18px"
    : w === "stars"
      ? "180px 140px, 180px 140px, 180px 140px, 180px 140px, auto"
      : undefined;
