"use client";
import { useSyncExternalStore } from "react";
import { scoped } from "@/lib/account-scope";

/** Per-device look: accent colour, chat text size, bubble shape. */
export interface Appearance {
  accent: string;
  text: "s" | "m" | "l";
  bubble: "round" | "soft" | "square";
}

export const ACCENTS = [
  ["#FF4F7B", "Rouge"],
  ["#E68AF5", "Orchid"],
  ["#FF8A7A", "Coral"],
  ["#FFC857", "Gold"],
  ["#5ED3B3", "Mint"],
  ["#6CB8FF", "Sky"],
  ["#B9A4FF", "Lilac"],
  ["#F4F0F5", "Pearl"],
] as const;

const KEY = "clink.appearance.v1";
const DEFAULT: Appearance = { accent: "#FF4F7B", text: "m", bubble: "round" };
let current: Appearance = DEFAULT;
const listeners = new Set<() => void>();

function load(key: string = KEY): Appearance {
  try {
    const raw = localStorage.getItem(key) ?? localStorage.getItem(KEY);
    return { ...DEFAULT, ...(JSON.parse(raw ?? "{}") as Partial<Appearance>) };
  } catch {
    return DEFAULT;
  }
}
if (typeof window !== "undefined") current = load();

/** Each account keeps its own look: load and apply the signed-in account's. */
export function loadAppearanceFor() {
  current = load(scoped(KEY));
  applyAppearance(current);
  listeners.forEach((l) => l());
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Writes the look onto the page as CSS variables (After Dark keeps its own Ember). */
export function applyAppearance(a: Appearance = current) {
  const s = document.documentElement.style;
  const custom = a.accent.toUpperCase() !== DEFAULT.accent;
  const set = (k: string, v: string) => (custom ? s.setProperty(k, v) : s.removeProperty(k));
  set("--accent", a.accent);
  set("--accent-soft", rgba(a.accent, 0.22));
  set("--accent-glow", rgba(a.accent, 0.6));
  set("--accent-glow-55", rgba(a.accent, 0.55));
  set("--accent-glow-45", rgba(a.accent, 0.45));
  set("--accent-halo", rgba(a.accent, 0.18));
  set("--accent-wash", rgba(a.accent, 0.06));
  s.setProperty("--chat-text", a.text === "s" ? "14px" : a.text === "l" ? "18.5px" : "16px");
  s.setProperty(
    "--bubble-r",
    a.bubble === "square" ? "8px" : a.bubble === "soft" ? "14px" : "20px",
  );
  s.setProperty("--bubble-j", a.bubble === "square" ? "3px" : a.bubble === "soft" ? "5px" : "6px");
}

export function setAppearance(p: Partial<Appearance>) {
  current = { ...current, ...p };
  try {
    localStorage.setItem(scoped(KEY), JSON.stringify(current));
    // The device default is what loads first (before an account is known).
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage blocked: applies for this visit only */
  }
  applyAppearance(current);
  listeners.forEach((l) => l());
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => DEFAULT,
  );
}
