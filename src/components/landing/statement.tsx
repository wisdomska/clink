"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useReducedMotion } from "@/lib/feedback";

const FAINT = "#a08d98";
const TEXT = "#fbf3f6";
const ROUGE = "#ff4f7b";

/* Words marked with * end in Rouge. */
const COPY =
  "Love lives in the little things. Clink gives them somewhere to go: *a *tap, *a *voice *note, *a *game, *a *letter *for *later.";

function Word({
  word,
  i,
  n,
  progress,
  still,
}: {
  word: string;
  i: number;
  n: number;
  progress: MotionValue<number>;
  still: boolean;
}) {
  const hot = word.startsWith("*");
  const text = hot ? word.slice(1) : word;
  const end = hot ? ROUGE : TEXT;
  const start = i / n;
  const color = useTransform(progress, [start, Math.min(1, start + 1.5 / n)], [FAINT, end]);
  return <motion.span style={{ color: still ? end : color }}>{text} </motion.span>;
}

/**
 * Editorial statement. Words light up in reading order as it scrolls through
 * the viewport, so the eye lands on the payoff last. Fully lit for reduced motion.
 */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = COPY.split(" ");
  return (
    <section
      aria-label="Why Clink"
      className="mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-36 xl:px-12"
    >
      <p
        ref={ref}
        className="display m-0 max-w-[22ch] text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[1.02] tracking-[-0.03em] text-balance"
      >
        {words.map((w, i) => (
          <Word key={i} word={w} i={i} n={words.length} progress={scrollYProgress} still={still} />
        ))}
      </p>
    </section>
  );
}
