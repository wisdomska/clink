"use client";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onProgress` with how far `ref` has scrolled through the viewport,
 * 0 to 1, at most once per frame and only while it is near the screen.
 *
 * `start` is where (as a fraction of the viewport height) the element's top
 * sits at 0; `end` is where its bottom sits at 1. Motion's useScroll offsets
 * ["start 0.85", "end 0.5"] are `start = 0.85, end = 0.5`.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  start: number,
  end: number,
  onProgress: (p: number) => void,
) {
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let last = -1;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = start * vh - end * vh + r.height;
      const p = span <= 0 ? 1 : Math.min(1, Math.max(0, (start * vh - r.top) / span));
      if (p !== last) {
        last = p;
        cb.current(p);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // Listen only while the element is within a screen of the viewport.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll, { passive: true });
          onScroll();
        } else {
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
          // Settle at the nearest end when it leaves, so a fast fling never strands it midway.
          measure();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, start, end]);
}
