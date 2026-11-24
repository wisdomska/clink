"use client";
import { useRef } from "react";
import { useScrollProgress } from "./use-scroll-progress";

/* Words marked with * end in Rouge. */
const COPY =
  "Love lives in the little things. Clink gives them somewhere to go: *a *tap, *a *voice *note, *a *game, *a *letter *for *later.";
const WORDS = COPY.split(" ");
const N = WORDS.length;

/**
 * Editorial statement. Words light up in reading order as it scrolls through
 * the viewport, so the eye lands on the payoff last. The scroll position is
 * written to one CSS variable (--p) and each word mixes its own colour from
 * it (landing.css, "statement"). Fully lit for reduced motion.
 */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  useScrollProgress(ref, 0.85, 0.5, (p) => ref.current?.style.setProperty("--p", String(p)));
  return (
    <section
      aria-label="Why Clink"
      className="mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-36 xl:px-12"
    >
      <p
        ref={ref}
        className="display m-0 max-w-[22ch] text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[1.02] tracking-[-0.03em] text-balance"
      >
        {WORDS.map((w, i) => {
          const hot = w.startsWith("*");
          // Each word lights over 1.5 words' worth of scroll, the last ones by the end.
          const from = i / N;
          const to = Math.min(1, from + 1.5 / N);
          return (
            <span
              key={i}
              className="lp-word"
              style={{
                ["--s" as string]: from,
                ["--k" as string]: 1 / (to - from),
                ["--end" as string]: hot ? "var(--rouge)" : "var(--text)",
              }}
            >
              {hot ? w.slice(1) : w}{" "}
            </span>
          );
        })}
      </p>
    </section>
  );
}
