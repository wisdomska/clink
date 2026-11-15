"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

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

/** Honours the in-app Motion setting (Settings) as well as the OS preference. */
export { useReducedMotion as usePrefersReducedMotion } from "@/lib/feedback";
