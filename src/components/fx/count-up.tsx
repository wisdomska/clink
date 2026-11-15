"use client";
import { useEffect, useRef } from "react";
import { reducedMotion } from "@/lib/feedback";

/**
 * Counts from 0 to `value` with an ease-out curve. Writes the text node
 * directly each frame, so React never re-renders mid-count. Reduced motion
 * (or `instant`) shows the final number straight away.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 0,
  instant = false,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  instant?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (instant || reducedMotion()) {
      el.textContent = String(value);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      el.textContent = String(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = "0";
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay, instant]);
  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {value}
    </span>
  );
}
