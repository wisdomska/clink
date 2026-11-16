"use client";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";

/**
 * A memoji used as illustration (onboarding, linking): pops in, then floats
 * gently. Decorative, so hidden from screen readers. Still for reduced motion.
 */
export function MemojiArt({
  person,
  pose,
  size = 112,
  delay = 0,
  tilt = 0,
  className,
}: {
  person: string;
  pose: string;
  size?: number;
  delay?: number;
  tilt?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={cn("relative flex-none", className)}
      style={{ width: size, height: size }}
      initial={reduced ? false : { opacity: 0, scale: 0.6, y: 12, rotate: tilt * 2 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: tilt }}
      transition={{ type: "spring", stiffness: 380, damping: 20, delay }}
    >
      <motion.img
        src={`/memoji/${person}-${pose}.webp`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full object-contain select-none"
        animate={reduced ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
      />
    </motion.div>
  );
}
