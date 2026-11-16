"use client";
import { useEffect, useRef } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

/**
 * Scroll reveals for every [data-reveal] element on the landing page.
 *
 * Nothing is hidden until the visitor scrolls for the first time, so the first
 * paint, crawlers and full-page screenshots always see the whole page. On that
 * first scroll, anything already on screen is marked shown, then the page is
 * "armed" and sections still below the fold wait to rise in as they arrive.
 */
export function RevealController() {
  const armed = useRef(false);
  const io = useRef<IntersectionObserver | null>(null);
  const { scrollY } = useScroll();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    io.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.shown = "";
          io.current?.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.current?.observe(el));
    return () => {
      io.current?.disconnect();
      delete document.documentElement.dataset.lpArmed;
    };
  }, []);

  useMotionValueEvent(scrollY, "change", () => {
    if (armed.current) return;
    armed.current = true;
    const h = window.innerHeight;
    for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])")) {
      if (el.getBoundingClientRect().top < h) el.dataset.shown = "";
    }
    document.documentElement.dataset.lpArmed = "";
  });

  return null;
}
