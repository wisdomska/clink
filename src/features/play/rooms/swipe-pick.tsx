"use client";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "motion/react";
import { useEffect } from "react";
import { haptic, useReducedMotion } from "@/lib/feedback";

const FLICK = 96; // px past which a drag counts
const FLICK_SHORT = 24; // ...or a short, fast flick

/**
 * Swipe to choose between two options: left for A, right for B. The card tilts
 * with the drag, the chosen side's label fades in, and an undecided drag springs
 * back. Arrow keys (or A/B) choose too. The tap buttons stay as the accessible path.
 */
export function SwipePick({
  a,
  b,
  disabled,
  onPick,
}: {
  a: string;
  b: string;
  disabled?: boolean;
  onPick: (k: "a" | "b") => void;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, (v) => Math.max(-12, Math.min(12, v / 14)));
  const aOpacity = useTransform(x, (v) => Math.max(0, Math.min(1, -v / FLICK)));
  const bOpacity = useTransform(x, (v) => Math.max(0, Math.min(1, v / FLICK)));

  const choose = (k: "a" | "b") => {
    if (disabled) return;
    haptic("select");
    if (reduced) return onPick(k);
    void animate(x, k === "a" ? -420 : 420, { duration: 0.22, ease: [0.23, 1, 0.32, 1] }).then(() =>
      onPick(k),
    );
  };

  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") choose("a");
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "b") choose("b");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const v = Math.abs(info.velocity.x) / 1000;
    if (Math.abs(dx) > FLICK || (Math.abs(dx) > FLICK_SHORT && v > 0.5)) choose(dx < 0 ? "a" : "b");
    else void animate(x, 0, { duration: 0.32, ease: [0.34, 1.3, 0.64, 1] });
  };

  return (
    <div className="relative h-[150px] select-none" aria-hidden>
      <motion.div
        drag={disabled || reduced ? false : "x"}
        dragMomentum={false}
        dragElastic={1}
        onDragEnd={onDragEnd}
        style={{ x, rotate, touchAction: "pan-y" }}
        className="rounded-card border-line bg-s2 absolute inset-0 flex cursor-grab items-center justify-between gap-3 border px-5 active:cursor-grabbing"
      >
        <motion.span
          style={{ opacity: aOpacity }}
          className="border-accent text-accent max-w-[45%] -rotate-6 rounded-lg border-2 px-2 py-1 text-sm font-bold"
        >
          {a}
        </motion.span>
        <span className="text-faint mx-auto text-center text-sm">
          Swipe left or right
          <span className="mono mt-1 block text-xs">← A · B →</span>
        </span>
        <motion.span
          style={{ opacity: bOpacity, borderColor: "var(--partner-b)", color: "var(--partner-b)" }}
          className="max-w-[45%] rotate-6 rounded-lg border-2 px-2 py-1 text-right text-sm font-bold"
        >
          {b}
        </motion.span>
      </motion.div>
    </div>
  );
}
