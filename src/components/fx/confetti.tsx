"use client";
import { useEffect, useRef } from "react";
import { reducedMotion } from "@/lib/feedback";

const COLOURS = ["var(--accent)", "var(--partner-b)", "#F4F0F5", "var(--warning)"];

/** Small seeded PRNG so a burst looks the same on every render (and in tests). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/**
 * Celebration burst. Runs on the compositor (Element.animate), never blocks
 * taps (pointer-events: none) and a tap anywhere fades it out at once.
 * Reduced motion: a few still pieces that fade in and out.
 */
export function Confetti({ count = 36, seed = 7 }: { count?: number; seed?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = reducedMotion();
    const rand = rng(seed);
    const height = el.clientHeight || 600;
    const n = reduce ? 8 : count;
    const anims: Animation[] = [];
    for (let i = 0; i < n; i++) {
      const piece = document.createElement("span");
      const w = 6 + rand() * 6;
      piece.style.cssText = `position:absolute;top:0;left:${rand() * 100}%;width:${w}px;height:${w * (rand() > 0.5 ? 0.45 : 1)}px;background:${COLOURS[i % COLOURS.length]};border-radius:${rand() > 0.6 ? "999px" : "2px"};`;
      el.appendChild(piece);
      const drift = (rand() - 0.5) * 160;
      const rotate = rand() * 360;
      const spin = (rand() - 0.5) * 720;
      anims.push(
        piece.animate(
          reduce
            ? [
                { opacity: 0 },
                { opacity: 1, offset: 0.2 },
                { opacity: 1, offset: 0.7 },
                { opacity: 0 },
              ]
            : [
                { transform: `translate3d(0,-24px,0) rotate(${rotate}deg)`, opacity: 1 },
                {
                  transform: `translate3d(${drift}px,${height * 0.85}px,0) rotate(${rotate + spin}deg)`,
                  opacity: 1,
                  offset: 0.85,
                },
                {
                  transform: `translate3d(${drift * 1.1}px,${height + 40}px,0) rotate(${rotate + spin * 1.2}deg)`,
                  opacity: 0,
                },
              ],
          {
            duration: reduce ? 900 : 1600 + rand() * 900,
            delay: reduce ? (i % 4) * 60 : rand() * 250,
            easing: "linear",
            fill: "both",
          },
        ),
      );
    }
    const skip = () => {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" });
    };
    window.addEventListener("pointerdown", skip, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", skip);
      anims.forEach((a) => a.cancel());
      el.replaceChildren();
    };
  }, [count, seed]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[75] overflow-hidden"
    />
  );
}
