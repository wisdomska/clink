"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/components/ui/cn";
import { useReducedMotion } from "@/lib/feedback";
import { LogoMark, Wordmark } from "./logo";

export interface Moment {
  icon: React.ReactNode;
  /** Icon tile colour (any CSS colour). */
  tone: string;
  title: string;
  meta: string;
}

/**
 * The brand panel beside sign-in screens: deep plum, a faint watermark mark,
 * real-looking "moments" that cycle like notifications, and an editorial headline. Purely decorative; screen readers skip it.
 */
export function BrandPoster({
  eyebrow,
  headline,
  sub,
  moments,
  chips,
  compact = false,
  className,
}: {
  eyebrow?: string;
  headline: React.ReactNode;
  sub?: string;
  moments: Moment[];
  chips?: string[];
  compact?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced || moments.length < 2) return;
    const t = setInterval(() => setTick((n) => n + 1), 2800);
    return () => clearInterval(t);
  }, [reduced, moments.length]);

  const shown = compact ? 1 : Math.min(3, moments.length);
  const visible = Array.from({ length: shown }, (_, i) => {
    const idx = (tick + i) % moments.length;
    return { m: moments[idx]!, key: `${tick + i}` };
  });

  return (
    <div
      aria-hidden
      className={cn(
        "relative isolate flex flex-col overflow-hidden text-[#FBF3F6]",
        compact
          ? "rounded-card min-h-[200px] border border-[#3A1F2C] p-5"
          : "h-full rounded-[24px] border border-[#3A1F2C] p-10 xl:p-14",
        className,
      )}
      style={{ background: "linear-gradient(160deg, #2A101C 0%, #1B0D14 55%, #140A10 100%)" }}
    >
      {/* Watermark */}
      <div
        className={cn(
          "pointer-events-none absolute -z-10 opacity-[.07]",
          compact ? "-right-6 -bottom-10" : "top-[12%] -right-16",
        )}
      >
        <LogoMark size={compact ? 220 : 560} animate={false} decorative />
      </div>

      {/* Top bar */}
      <div className="flex items-center gap-2.5">
        <LogoMark size={compact ? 30 : 38} decorative />
        <Wordmark size={compact ? 24 : 30} className="text-[#FBF3F6]" />
        {eyebrow && (
          <span className="ml-1 rounded-md border border-[#4A2A3A] px-2 py-0.5 text-xs font-semibold text-white/75">
            {eyebrow}
          </span>
        )}
      </div>

      {/* Moments */}
      <div
        className={cn(
          "relative flex flex-col gap-2.5",
          compact ? "mt-auto mb-0 max-w-[300px] pt-6" : "mt-auto mb-10 max-w-[380px]",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map(({ m, key }, i) => (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{
                opacity: 1 - i * 0.22,
                y: 0,
                scale: 1 - i * 0.03,
                x: compact ? 0 : i * 18,
              }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="flex items-center gap-3 rounded-2xl border border-[#3F2230] bg-[#2A1520] p-3 pr-4"
            >
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[#1A0A10]"
                style={{ background: m.tone }}
              >
                {m.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{m.title}</span>
                <span className="block truncate text-xs text-white/70">{m.meta}</span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Headline */}
      {!compact && (
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 26, delay: 0.15 }}
            className="display m-0 pb-1 text-[clamp(44px,4.6vw,68px)] leading-[1.02] font-extrabold tracking-[-0.03em]"
          >
            {headline}
          </motion.h2>
          {sub && <p className="mt-4 mb-0 max-w-[44ch] text-base text-white/75">{sub}</p>}
          {chips && (
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#3A1F2C] pt-5 text-sm font-medium text-white/60">
              {chips.map((c, i) => (
                <span key={c} className="flex items-center gap-3">
                  {i > 0 && <span className="h-1 w-1 rounded-full bg-white/30" />}
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {compact && (
        <div className="display mt-4 text-[26px] leading-[1.05] font-extrabold tracking-[-0.02em]">
          {headline}
        </div>
      )}
    </div>
  );
}
