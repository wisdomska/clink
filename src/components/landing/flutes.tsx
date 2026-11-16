"use client";
import { useId } from "react";
import { motion } from "motion/react";
import { MARK, BRAND } from "@/components/brand/mark-paths";
import { cn } from "@/components/ui/cn";

/** One clink cycle for the hero: apart, swing in, touch, settle, hold, drift apart. */
export const LOOP = { duration: 6.5, repeat: Infinity, ease: "easeInOut" as const };
export const LOOP_TIMES = [0, 0.1, 0.28, 0.36, 0.42, 0.86, 1];
/** When the rims touch, as a fraction of LOOP.duration. */
export const TOUCH_AT = 0.28;

const APART = 13;

/**
 * The Clink mark's two flutes as separate pieces, so they can travel in from
 * each side of a split scene and meet in the middle. Paths come from the
 * brand source of truth; never redraw them.
 *
 * - mode "loop": clinks forever on the LOOP clock (hero).
 * - mode "once": swings in once; change `playKey` to clink again (demo).
 * - still: the resting 9 degree pose with the spark lit (reduced motion).
 */
export function Flutes({
  mode,
  playKey = 0,
  still = false,
  className,
}: {
  mode: "loop" | "once";
  playKey?: number;
  still?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");

  const flute = (dir: 1 | -1) => {
    if (still) return { initial: false as const, animate: { x: 0, rotate: dir * 9 } };
    if (mode === "loop")
      return {
        initial: { x: -dir * APART, rotate: dir * 24 },
        animate: {
          x: [-dir * APART, -dir * APART, 0, 0, 0, 0, -dir * APART],
          rotate: [dir * 24, dir * 24, dir * 2, dir * 11, dir * 9, dir * 9, dir * 24],
        },
        transition: { ...LOOP, times: LOOP_TIMES },
      };
    return {
      initial: { x: -dir * APART, rotate: dir * 24 },
      animate: { x: [-dir * APART, 0, 0, 0], rotate: [dir * 24, dir * 2, dir * 11, dir * 9] },
      transition: { duration: 0.75, times: [0, 0.45, 0.72, 1], ease: "easeOut" as const },
    };
  };

  const spark = still
    ? { initial: false as const, animate: { scale: 1, opacity: 1 } }
    : mode === "loop"
      ? {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: [0, 0, 1.5, 1, 1, 0, 0], opacity: [0, 0, 1, 1, 1, 0, 0] },
          transition: { ...LOOP, times: [0, TOUCH_AT, 0.33, 0.4, 0.8, 0.86, 1] },
        }
      : {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: [0, 1.5, 1], opacity: [0, 1, 1] },
          transition: { duration: 0.45, delay: 0.32 },
        };

  return (
    <svg
      key={playKey}
      viewBox={MARK.viewBox}
      aria-hidden
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`fl${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.blush} />
          <stop offset="0.45" stopColor={BRAND.rouge} />
          <stop offset="1" stopColor="#D9305E" />
        </linearGradient>
        <linearGradient id={`fr${id}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRAND.champagne} />
          <stop offset="0.5" stopColor="#FF7A5C" />
          <stop offset="1" stopColor={BRAND.ember} />
        </linearGradient>
      </defs>
      <motion.g
        style={{ originX: "50%", originY: "18.75%", transformBox: "view-box" }}
        {...flute(1)}
      >
        <path d={MARK.left} fill={`url(#fl${id})`} />
        <path
          d={MARK.leftFizz}
          fill="none"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </motion.g>
      <motion.g
        style={{ originX: "50%", originY: "18.75%", transformBox: "view-box" }}
        {...flute(-1)}
      >
        <path d={MARK.right} fill={`url(#fr${id})`} />
        <path
          d={MARK.rightFizz}
          fill="none"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </motion.g>
      <motion.path
        d={MARK.spark}
        fill={BRAND.champagne}
        style={{ originX: "50%", originY: "9%", transformBox: "view-box" }}
        {...spark}
      />
    </svg>
  );
}
