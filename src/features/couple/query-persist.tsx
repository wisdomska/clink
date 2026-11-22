"use client";
import { useEffect } from "react";
import { dehydrate, hydrate, useQueryClient } from "@tanstack/react-query";
import { useCouple } from "./context";

/**
 * The Us cards remember their last answer on this device, so reopening Clink
 * shows your streak, moods, countdowns, ritual and weather straight away while
 * fresh data loads, instead of empty cards.
 *
 * Only those small cards, never messages, photos or memories (On this day) and
 * never anything from After Dark. Nothing is kept when app lock or discreet
 * mode is on. Saved per person and cleared on sign-out (forgetSaved).
 */
const KEEP = new Set(["streak", "moods", "countdowns", "ritual", "milestone-today", "weather"]);
const PREFIX = "clink-q:v1:";
const MAX_AGE = 7 * 86_400_000;

export function forgetSaved() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* storage blocked: nothing was saved either */
  }
}

export function QueryPersist() {
  const qc = useQueryClient();
  const { me, appLock, discreet } = useCouple();
  const off = appLock || discreet || !me.id;

  useEffect(() => {
    if (off) {
      forgetSaved();
      return;
    }
    const key = PREFIX + me.id;
    // Applied after the page has hydrated (the server never sees this), and
    // never over data that's newer: hydrate keeps whichever is more recent.
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { at: number; state: Parameters<typeof hydrate>[1] };
        if (Date.now() - saved.at < MAX_AGE) hydrate(qc, saved.state);
        else localStorage.removeItem(key);
      }
    } catch {
      /* a bad copy is simply ignored */
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      try {
        const state = dehydrate(qc, {
          shouldDehydrateQuery: (q) =>
            q.state.status === "success" && KEEP.has(String(q.queryKey[0])),
        });
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), state }));
      } catch {
        /* full or blocked: the cards just load as before */
      }
    };
    const stop = qc.getQueryCache().subscribe((e) => {
      if (e.type !== "updated" || !KEEP.has(String(e.query.queryKey[0]))) return;
      clearTimeout(timer);
      timer = setTimeout(save, 800);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [qc, me.id, off]);

  return null;
}
