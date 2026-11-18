"use client";
import { useSyncExternalStore } from "react";
import { Lightbulb, X } from "@phosphor-icons/react";

const KEY = "clink.tips.seen";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function seen(): Set<string> {
  return new Set(read().split(",").filter(Boolean));
}
function markSeen(id: string) {
  const s = seen();
  s.add(id);
  try {
    localStorage.setItem(KEY, [...s].join(","));
  } catch {
    /* storage blocked: it shows again next time, which is fine */
  }
  listeners.forEach((l) => l());
}

export interface Tip {
  id: string;
  text: string;
  /** Only show when this is true (e.g. discreet mode is on). */
  when?: boolean;
}

/**
 * One-time tips for gestures nobody would guess (hold the Clink button, press
 * and hold your partner, swipe to reply). One at a time; dismissed for good.
 */
export function Tips({ tips }: { tips: Tip[] }) {
  // Read on the device only, so the server render never shows a tip.
  const seenRaw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
  if (seenRaw === null) return null;
  const done = new Set(seenRaw.split(",").filter(Boolean));
  const tip = tips.find((t) => t.when !== false && !done.has(t.id));
  if (!tip) return null;
  return (
    <div
      role="note"
      aria-label="Tip"
      className="an-rise border-line bg-s1 rounded-input flex items-start gap-3 border px-3.5 py-3 text-sm"
    >
      <Lightbulb
        size={20}
        weight="fill"
        className="mt-px flex-none text-[var(--champagne)]"
        aria-hidden
      />
      <span className="text-text flex-1 leading-normal">{tip.text}</span>
      <button
        type="button"
        aria-label="Got it"
        onClick={() => markSeen(tip.id)}
        className="press text-muted hover:text-text -m-2 flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
      >
        <X size={18} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
