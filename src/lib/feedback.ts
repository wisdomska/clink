"use client";
import { useSyncExternalStore } from "react";

/**
 * One place for touch feedback: haptics and synthesised sounds.
 * - Haptics never throw, skip when unsupported, and stay off under reduced motion.
 * - Sounds are generated with Web Audio (no files to download), off by default,
 *   and unlocked on the first tap (iOS needs a user gesture).
 * - Both are per-device preferences, toggled in Settings.
 */

export type HapticName = "tap" | "select" | "send" | "receive" | "success" | "error" | "heavy";

const PATTERNS: Record<HapticName, number | number[]> = {
  tap: 8,
  select: 12,
  send: [14, 40, 22],
  receive: [30, 60, 30],
  success: [12, 50, 24],
  error: [40, 40, 40],
  heavy: 60,
};

const KEY = "clink_feedback";
export type MotionPref = "system" | "reduce" | "full";
interface Prefs {
  haptics: boolean;
  sound: boolean;
  motion: MotionPref;
}
const DEFAULTS: Prefs = { haptics: true, sound: false, motion: "system" };
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function setFeedbackPrefs(patch: Partial<Prefs>) {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* private mode: keep it for this session */
  }
  listeners.forEach((l) => l());
}

export function useFeedbackPrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULTS,
  );
}

function systemReduced() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The in-app Motion setting wins; "system" follows the OS. */
export function reducedMotion(prefs: Prefs = read()) {
  return prefs.motion === "reduce" || (prefs.motion === "system" && systemReduced());
}

/** Reactive version for components: updates on the in-app setting and the OS setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const mq =
        typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
      mq?.addEventListener("change", cb);
      return () => {
        listeners.delete(cb);
        mq?.removeEventListener("change", cb);
      };
    },
    () => reducedMotion(),
    () => false,
  );
}

/* iPhones have no Vibration API: a 2 px micro-shake on the last thing pressed stands in. */
let lastPressed: HTMLElement | null = null;
export function notePressed(el: HTMLElement | null) {
  lastPressed = el;
}
function shakeFallback() {
  const el = lastPressed;
  if (!el || reducedMotion()) return;
  el.classList.remove("haptic-shake");
  void el.offsetWidth; // restart the animation
  el.classList.add("haptic-shake");
  setTimeout(() => el.classList.remove("haptic-shake"), 220);
}

export function haptic(kind: HapticName | number | number[] = "tap") {
  try {
    if (typeof navigator === "undefined" || !read().haptics || reducedMotion()) return;
    // Browsers refuse vibration before the first user gesture (and log an error).
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    if (activation && !activation.hasBeenActive) return;
    if (typeof navigator.vibrate !== "function") return shakeFallback();
    navigator.vibrate(typeof kind === "string" ? PATTERNS[kind] : kind);
  } catch {
    /* iOS Safari has no vibration: visuals carry the moment */
  }
}

/* ---------------------------------------------------------------- sound */

export type SoundName =
  "clink" | "pop" | "tick" | "send" | "success" | "error" | "unlock" | "flip" | "win" | "toggle";

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a user gesture so later sounds can play (iOS). */
export function primeSound() {
  if (read().sound) audio();
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  gain: number,
  type: OscillatorType = "sine",
  endFreq?: number,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSound(name: SoundName) {
  if (!read().sound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case "clink": // two glasses: bright inharmonic partials with a slow decay
      tone(c, 2637, t, 0.9, 0.08);
      tone(c, 3951, t, 0.6, 0.04);
      tone(c, 5274, t + 0.004, 0.35, 0.02);
      break;
    case "pop":
      tone(c, 520, t, 0.09, 0.12, "triangle", 880);
      break;
    case "send":
      tone(c, 660, t, 0.12, 0.08, "sine", 990);
      break;
    case "success":
      tone(c, 784, t, 0.18, 0.08);
      tone(c, 1175, t + 0.09, 0.26, 0.08);
      break;
    case "error":
      tone(c, 220, t, 0.16, 0.1, "triangle", 160);
      break;
    case "unlock":
      tone(c, 523, t, 0.12, 0.07);
      tone(c, 784, t + 0.07, 0.12, 0.07);
      tone(c, 1047, t + 0.14, 0.3, 0.07);
      break;
    case "tick": // the quiet press used app-wide
      tone(c, 1800, t, 0.025, 0.025, "triangle", 1200);
      break;
    case "toggle":
      tone(c, 880, t, 0.06, 0.05, "sine", 1320);
      break;
    case "win": // a little rising fanfare
      tone(c, 523, t, 0.16, 0.08);
      tone(c, 659, t + 0.1, 0.16, 0.08);
      tone(c, 784, t + 0.2, 0.18, 0.08);
      tone(c, 1047, t + 0.3, 0.5, 0.09);
      break;
    case "flip":
      tone(c, 1400, t, 0.03, 0.05, "square", 900);
      break;
  }
}

/** Haptic and sound together, for the big moments. */
export function feedback(h: HapticName, s?: SoundName) {
  haptic(h);
  if (s) playSound(s);
}
