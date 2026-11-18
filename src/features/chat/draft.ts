"use client";
import { useEffect, useRef } from "react";

const key = (coupleId: string) => `clink.draft.${coupleId}`;

export function readDraft(coupleId: string): string {
  try {
    return localStorage.getItem(key(coupleId)) ?? "";
  } catch {
    return "";
  }
}

/**
 * Keeps what you're typing on this device, so a reload, an app update or the
 * phone closing Clink in the background never loses a half-written message.
 * Edits of sent messages aren't drafts and aren't saved.
 */
export function useDraft(
  coupleId: string,
  text: string,
  editing: boolean,
  restore: (t: string) => void,
) {
  const loaded = useRef(false);
  // Bring the draft back once, after the first render (the server can't know it).
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const saved = readDraft(coupleId);
    if (saved) restore(saved);
  }, [coupleId, restore]);
  useEffect(() => {
    if (!loaded.current || editing) return;
    const t = setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(key(coupleId), text);
        else localStorage.removeItem(key(coupleId));
      } catch {
        /* storage blocked: nothing to keep */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [coupleId, text, editing]);
}
