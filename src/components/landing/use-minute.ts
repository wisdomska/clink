"use client";
import { useSyncExternalStore } from "react";

/* One shared minute clock for every live time on the page. */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  const ms = 60_000 - (Date.now() % 60_000) + 50;
  timer = setTimeout(() => {
    listeners.forEach((l) => l());
    schedule();
  }, ms);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) schedule();
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

const minute = () => Math.floor(Date.now() / 60_000);

/** The current minute (epoch minutes), or null while server rendering and hydrating. */
export function useMinute(): number | null {
  return useSyncExternalStore(subscribe, minute, () => null);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** "22:14" in the given IANA time zone. */
export function clockIn(epochMinute: number, timeZone: string) {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    fmtCache.set(timeZone, f);
  }
  return f.format(new Date(epochMinute * 60_000));
}
