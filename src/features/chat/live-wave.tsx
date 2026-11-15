"use client";
import { useEffect, useRef } from "react";

const N = 36;

/**
 * Scrolling waveform from the live microphone level while you record:
 * new bars enter on the right, louder means taller. Writes straight to the
 * DOM each frame (no React re-renders).
 */
export function LiveWave({ level }: { level: () => number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bars = Array.from(box.current?.children ?? []) as HTMLElement[];
    const vals = new Array<number>(N).fill(0.06);
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 70) return;
      last = now;
      vals.shift();
      vals.push(Math.max(0.06, level()));
      bars.forEach((b, i) => {
        b.style.transform = `scaleY(${vals[i]!})`;
        b.style.opacity = String(0.35 + vals[i]! * 0.65);
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level]);
  return (
    <div ref={box} className="flex h-7 min-w-0 flex-1 items-center gap-[2px]" aria-hidden>
      {Array.from({ length: N }, (_, i) => (
        <span
          key={i}
          className="bg-accent block h-full min-w-[2px] flex-1 origin-center rounded-full transition-transform duration-75"
          style={{ transform: "scaleY(.06)" }}
        />
      ))}
    </div>
  );
}
