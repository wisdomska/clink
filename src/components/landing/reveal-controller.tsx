"use client";
import { useEffect } from "react";

/**
 * Scroll reveals for every [data-reveal] element on the landing page.
 *
 * Nothing is hidden until the visitor scrolls for the first time, so the first
 * paint, crawlers and full-page screenshots always see the whole page. On that
 * first scroll, anything already on screen is marked shown, then the page is
 * "armed" and sections still below the fold wait to rise in as they arrive.
 *
 * It also pauses every [data-loop] region while it is off screen (landing.css,
 * "loops"), so looping animations cost nothing until they can be seen.
 */
export function RevealController() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.shown = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));

    const loops = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) delete el.dataset.paused;
        else el.dataset.paused = "";
      }
    });
    document.querySelectorAll("[data-loop]").forEach((el) => loops.observe(el));

    const arm = () => {
      const h = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])")) {
        if (el.getBoundingClientRect().top < h) el.dataset.shown = "";
      }
      document.documentElement.dataset.lpArmed = "";
    };
    window.addEventListener("scroll", arm, { once: true, passive: true });

    return () => {
      io.disconnect();
      loops.disconnect();
      window.removeEventListener("scroll", arm);
      delete document.documentElement.dataset.lpArmed;
    };
  }, []);

  return null;
}
