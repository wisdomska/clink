"use client";
import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import {
  notePressed,
  playSound,
  primeSound,
  useFeedbackPrefs,
  useReducedMotion,
} from "@/lib/feedback";

const PRESSABLE = "button, [role=button], [role=switch], [role=tab], [role=radio], a[href]";

/**
 * App-wide feedback: Motion components follow the in-app Motion setting, the
 * page gets data-motion for CSS, and one capture listener gives every press a
 * quiet tick (when Sound is on), unlocks audio on iOS, and remembers the
 * pressed element for the iPhone haptic stand-in. Opt out with data-no-tick.
 */
export function FeedbackRoot({ children }: { children: ReactNode }) {
  const prefs = useFeedbackPrefs();
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.motion === "system") delete root.dataset.motion;
    else root.dataset.motion = prefs.motion;
  }, [prefs.motion]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      primeSound();
      const el = (e.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
      notePressed(el);
      if (!el || el.closest("[data-no-tick]") || el.getAttribute("aria-disabled") === "true")
        return;
      if ((el as HTMLButtonElement).disabled) return;
      const role = el.getAttribute("role");
      if (role === "switch") playSound("toggle");
      else if ((role === "tab" || role === "radio") && el.getAttribute("aria-selected") === "true")
        return;
      else playSound("tick");
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);

  return <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>;
}
