"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * After an in-app navigation, move focus to the new screen's main heading,
 * so keyboard and screen-reader users land where everyone else's eyes do
 * (and hear where they are). Not on first load, and never if you're already
 * typing in a field. Doesn't scroll.
 */
export function RouteFocus() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // The new screen may still be loading: look for its heading for ~1.5 s.
    let tries = 0;
    let t: ReturnType<typeof setTimeout>;
    const attempt = () => {
      const active = document.activeElement;
      if (
        active &&
        active !== document.body &&
        active.matches("input, textarea, select, [contenteditable]")
      )
        return;
      // A dialog open over the screen keeps its own focus.
      if (document.querySelector("[role=dialog][aria-modal=true]")) return;
      const h = document.querySelector<HTMLElement>("main h1, h1");
      if (!h || h.closest("[aria-busy=true]")) {
        if (++tries < 15) t = setTimeout(attempt, 100);
        return;
      }
      if (!h.hasAttribute("tabindex")) {
        // Never touch markup React hasn't taken over yet: an extra attribute
        // there is a hydration mismatch. Wait for it instead.
        const hydrated = Object.keys(h).some((k) => k.startsWith("__reactFiber$"));
        if (!hydrated) {
          if (++tries < 15) t = setTimeout(attempt, 100);
          return;
        }
        h.setAttribute("tabindex", "-1");
      }
      h.focus({ preventScroll: true });
    };
    t = setTimeout(attempt, 60);
    return () => clearTimeout(t);
  }, [path]);
  return null;
}
