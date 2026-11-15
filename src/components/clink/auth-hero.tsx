"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "@/lib/feedback";

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * 46, y: Math.sin(a) * 34 - 6, d: i * 0.015 };
});

/**
 * The sign-in hero: two people glide in from either side, the glasses drop
 * between them and clink (with a burst of sparks), then everything floats.
 * The clink repeats every few seconds. Calm, still version for reduced motion.
 */
export function AuthHero({ mode }: { mode: "login" | "signup" }) {
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setBeat((b) => b + 1), 3600);
    return () => clearInterval(t);
  }, [reduced]);

  const left = mode === "signup" ? "w-wave-m" : "w-dance-ml";
  const right = mode === "signup" ? "m-wave-md" : "m-ok-m";

  return (
    <div
      className="relative mx-auto flex h-[150px] w-full max-w-[340px] items-end justify-center"
      aria-hidden
    >
      <motion.img
        src={`/avatars/p/${left}.webp`}
        alt=""
        className="absolute bottom-0 left-2 h-[118px] w-[118px] object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.45)]"
        initial={reduced ? false : { x: -90, opacity: 0.01, rotate: -12 }}
        animate={reduced ? {} : { x: 0, opacity: 1, rotate: 0, y: [0, -5, 0] }}
        transition={{
          x: { type: "spring", stiffness: 140, damping: 16 },
          rotate: { type: "spring", stiffness: 140, damping: 12 },
          opacity: { duration: 0.3 },
          y: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
        }}
      />
      <motion.img
        src={`/avatars/p/${right}.webp`}
        alt=""
        className="absolute right-2 bottom-0 h-[118px] w-[118px] object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.45)]"
        initial={reduced ? false : { x: 90, opacity: 0.01, rotate: 12 }}
        animate={reduced ? {} : { x: 0, opacity: 1, rotate: 0, y: [0, -5, 0] }}
        transition={{
          x: { type: "spring", stiffness: 140, damping: 16, delay: 0.08 },
          rotate: { type: "spring", stiffness: 140, damping: 12, delay: 0.08 },
          opacity: { duration: 0.3, delay: 0.08 },
          y: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.4 },
        }}
      />
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <motion.img
          key={beat}
          src="/stickers/clink.webp"
          alt=""
          className="h-[72px] w-[72px] object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,.45)]"
          initial={
            reduced ? false : beat === 0 ? { y: -60, scale: 0.4, opacity: 0.01 } : { rotate: 0 }
          }
          animate={
            reduced
              ? {}
              : beat === 0
                ? { y: 0, scale: 1, opacity: 1, rotate: [0, -14, 12, -6, 0] }
                : { rotate: [0, -16, 14, -8, 0], scale: [1, 1.12, 1] }
          }
          transition={
            beat === 0
              ? {
                  y: { type: "spring", stiffness: 260, damping: 14, delay: 0.45 },
                  scale: { delay: 0.45 },
                  opacity: { delay: 0.45 },
                  rotate: { duration: 0.6, delay: 0.9 },
                }
              : { duration: 0.6 }
          }
        />
        <AnimatePresence>
          {!reduced && (
            <span key={`s${beat}`} className="absolute top-1/2 left-1/2">
              {SPARKS.map((s, i) => (
                <motion.span
                  key={i}
                  className="bg-accent absolute h-1.5 w-1.5 rounded-full"
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                  animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.2] }}
                  transition={{
                    duration: 0.8,
                    delay: (beat === 0 ? 1.0 : 0.15) + s.d,
                    ease: "easeOut",
                  }}
                  style={{
                    background:
                      i % 3 === 0
                        ? "var(--champagne)"
                        : i % 3 === 1
                          ? "var(--accent)"
                          : "var(--lilac)",
                  }}
                />
              ))}
            </span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Slow drifting colour behind the auth screens. */
export function AuthGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <div className="auth-blob auth-blob-a" />
      <div className="auth-blob auth-blob-b" />
      <div className="auth-blob auth-blob-c" />
    </div>
  );
}
