"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { haptic } from "@/lib/feedback";

const noop = () => () => {};

/** A browser-only value read without setState-in-effect (server snapshot used during SSR). */
export function useClientValue<T>(get: () => T, server: T): T {
  return useSyncExternalStore(noop, get, () => server);
}

/** navigator.onLine as an external store. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** A localStorage string as an external store (storage access is wrapped: private windows may throw). */
export function useStoredString(key: string, fallback: string): [string, (v: string) => void] {
  const read = () => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const value = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    read,
    () => fallback,
  );
  const set = (v: string) => {
    try {
      localStorage.setItem(key, v);
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new StorageEvent("storage", { key }));
  };
  return [value, set];
}

/** Current time, ticking every `ms`. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Long-press (touch) or right-click (mouse) opens a context menu, the way
 * iMessage and WhatsApp do. Spread the handlers on the element; its normal tap
 * still works, and is swallowed only when the long-press fired. The haptic
 * lands the moment the press is recognised, not after any async work.
 */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  return {
    onPointerDown: (e: PointerEvent) => {
      fired.current = false;
      clear();
      if (e.pointerType === "mouse") return; // mouse uses right-click
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        haptic("heavy");
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: PointerEvent) => {
      // A scroll or drag is not a long-press.
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (fired.current) return; // touch long-press already opened it
      clear();
      onLongPress();
    },
    onClickCapture: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

/** Honours the in-app Motion setting (Settings) as well as the OS preference. */
export { useReducedMotion as usePrefersReducedMotion } from "@/lib/feedback";
