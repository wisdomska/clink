"use client";
import { useId, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";
import { useReducedMotion } from "@/lib/feedback";
import { MARK, BRAND } from "./mark-paths";

/**
 * The animated Clink mark. On mount the flutes swing in from apart, touch,
 * and a champagne spark pops. Hover or tap clinks again. Still for reduced motion.
 */
export function LogoMark({
  size = 40,
  animate = true,
  className,
  title = "Clink",
  decorative = false,
}: {
  size?: number;
  animate?: boolean;
  className?: string;
  title?: string;
  /** Hide from screen readers when a wordmark next to it already says "Clink". */
  decorative?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const live = animate && !reduced;
  const [n, setN] = useState(0);
  // Flutes pivot where the rims touch (32,15) and rest tilted 9deg, like the app icon.
  const swing = (dir: 1 | -1) =>
    live
      ? {
          initial: { rotate: dir * 32 },
          animate: { rotate: [dir * 32, dir * 3, dir * 11, dir * 9] },
          transition: {
            duration: 0.9,
            times: [0, 0.45, 0.72, 1],
            ease: "easeOut" as const,
            delay: 0.1,
          },
        }
      : { initial: false as const, animate: { rotate: dir * 9 } };
  return (
    <motion.svg
      viewBox={MARK.viewBox}
      width={(size * 64) / 80}
      height={size}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={cn("overflow-visible", className)}
      onHoverStart={() => live && setN((v) => v + 1)}
      onTap={() => live && setN((v) => v + 1)}
    >
      <defs>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.blush} />
          <stop offset="0.45" stopColor={BRAND.rouge} />
          <stop offset="1" stopColor="#D9305E" />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRAND.champagne} />
          <stop offset="0.5" stopColor="#FF7A5C" />
          <stop offset="1" stopColor={BRAND.ember} />
        </linearGradient>
      </defs>
      <motion.g
        key={`L${n}`}
        style={{ originX: "50%", originY: "18.75%", transformBox: "view-box" }}
        {...swing(1)}
      >
        <path d={MARK.left} fill={`url(#l${id})`} />
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
        key={`R${n}`}
        style={{ originX: "50%", originY: "18.75%", transformBox: "view-box" }}
        {...swing(-1)}
      >
        <path d={MARK.right} fill={`url(#r${id})`} />
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
        key={`S${n}`}
        d={MARK.spark}
        fill={BRAND.champagne}
        style={{ originX: "50%", originY: "9%" }}
        initial={live ? { scale: 0, rotate: -45, opacity: 0 } : false}
        animate={live ? { scale: [0, 1.4, 1], rotate: [-45, 15, 0], opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: n === 0 ? 0.55 : 0.35 }}
      />
    </motion.svg>
  );
}

/**
 * The wordmark: "clink" in Cabinet Grotesk, the i's dot replaced by a tiny
 * Rouge heart that pulses now and then.
 */
export function Wordmark({ size = 30, className }: { size?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span
      className={cn(
        "display relative inline-flex items-baseline leading-none font-extrabold tracking-[-0.03em]",
        className,
      )}
      style={{ fontSize: size }}
      aria-label="Clink"
      role="img"
    >
      <span aria-hidden>cl</span>
      <span aria-hidden className="relative">
        ı
        <motion.svg
          viewBox="0 0 24 22"
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2"
          style={{ width: size * 0.3, top: -size * 0.12 }}
          animate={reduced ? {} : { scale: [1, 1.25, 1, 1.15, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 3.5 }}
        >
          <path
            d="M12 21C5 15.5 1 11.6 1 7.2C1 3.9 3.6 1.3 6.8 1.3C8.9 1.3 10.8 2.4 12 4.1C13.2 2.4 15.1 1.3 17.2 1.3C20.4 1.3 23 3.9 23 7.2C23 11.6 19 15.5 12 21Z"
            fill={BRAND.rouge}
          />
        </motion.svg>
      </span>
      <span aria-hidden>nk</span>
    </span>
  );
}

/** Mark and wordmark together. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size * 1.25} decorative />
      <Wordmark size={size} />
    </span>
  );
}
