"use client";
import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { useReducedMotion } from "@/lib/feedback";

/**
 * Default for every Motion animation that doesn't set its own: a 180 ms
 * ease-out tween instead of Motion's default spring (which can run 500 ms+
 * and makes whileTap, entrances and exits feel late). Explicit transitions win.
 */
const SNAPPY = { type: "tween", duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const;

/**
 * Motion's defaults for the app: the in-app Motion setting and the snappy
 * tween. Lives in the app layouts (auth, couple, admin), not the root, so the
 * landing and public pages never download Motion; they animate with CSS.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"} transition={SNAPPY}>
      {children}
    </MotionConfig>
  );
}
