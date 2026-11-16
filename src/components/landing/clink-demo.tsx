"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Heart } from "@phosphor-icons/react";
import { Flutes } from "./flutes";
import { useStill } from "./use-still";
import { haptic, playSound } from "@/lib/feedback";

function reply(n: number) {
  if (n >= 10) return "Theo: get on a plane";
  if (n >= 5) return "Theo: okay, I miss you too";
  if (n >= 3) return "Theo sent one back";
  return "Theo felt it";
}

/**
 * Try the core gesture: tap the glasses, they clink, a heart crosses the
 * room and Theo's side reacts. Vibrates where the device allows.
 */
export function ClinkDemo() {
  const [count, setCount] = useState(0);
  const [travel, setTravel] = useState({ x: 0, y: 0 });
  const still = useStill();
  const btn = useRef<HTMLButtonElement>(null);
  const theo = useRef<HTMLDivElement>(null);

  const send = () => {
    if (btn.current && theo.current) {
      const a = btn.current.getBoundingClientRect();
      const b = theo.current.getBoundingClientRect();
      setTravel({
        x: b.left + b.width / 2 - (a.left + a.width / 2),
        y: b.top + b.height / 2 - (a.top + a.height / 2),
      });
    }
    setCount((c) => c + 1);
    haptic("send");
    playSound("clink");
  };

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
      <div data-reveal>
        <h2
          id="try-title"
          className="display m-0 text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] tracking-[-0.03em]"
        >
          Go on, send one.
        </h2>
        <p className="text-muted mt-5 mb-0 max-w-[38ch] text-lg leading-relaxed text-pretty">
          That&apos;s the whole idea. One tap here, and their device buzzes wherever they are.
        </p>
        <div className="mt-10 flex items-baseline gap-3" aria-live="polite" aria-atomic="true">
          <span className="mono text-text text-[64px] leading-none tracking-[-0.04em]">
            {count}
          </span>{" "}
          <span className="text-muted text-base">{count === 1 ? "clink sent" : "clinks sent"}</span>
        </div>
      </div>

      <div
        data-reveal
        style={{ ["--d" as string]: 1 }}
        className="rounded-card border-line bg-s1 relative grid h-[380px] grid-cols-2 overflow-hidden border sm:h-[440px]"
      >
        <div className="bg-[var(--bg-night)]" />
        <div className="bg-s2" />
        <div aria-hidden className="bg-line absolute inset-y-0 left-1/2 w-px" />

        {/* Ama (you) */}
        <div className="absolute bottom-5 left-5 flex items-center gap-2.5" aria-hidden>
          <Image
            src="/memoji/p10-love.webp"
            alt=""
            width={44}
            height={44}
            className="bg-s2 h-11 w-11 rounded-full object-contain p-[8%]"
          />
          <span className="text-text text-sm font-bold">You</span>
        </div>

        {/* Theo */}
        <div
          className="absolute right-5 bottom-5 flex flex-row-reverse items-center gap-2.5"
          aria-hidden
        >
          <motion.div
            key={count}
            ref={theo}
            initial={still || count === 0 ? false : { scale: 1 }}
            animate={still || count === 0 ? {} : { scale: [1, 1, 1.18, 1] }}
            transition={{ duration: 0.9, times: [0, 0.55, 0.75, 1] }}
            className="rounded-full"
          >
            <Image
              src="/memoji/p12-love.webp"
              alt=""
              width={44}
              height={44}
              className="bg-s2 h-11 w-11 rounded-full object-contain p-[8%]"
            />
          </motion.div>
          <span className="text-text text-sm font-bold">Theo</span>
        </div>

        <AnimatePresence>
          {count > 0 && (
            <motion.div
              key={count}
              aria-hidden
              className="bg-s3 border-line text-text absolute right-5 bottom-[84px] flex items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-sm font-medium"
              initial={still ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: still ? 0 : 0.6, duration: 0.3 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <span className="bg-accent text-on-accent flex h-5 w-5 items-center justify-center rounded-full">
                <Heart size={12} weight="fill" />
              </span>
              {reply(count)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The button, centred over the seam */}
        <div className="absolute inset-0 flex items-center justify-center pb-10">
          <div className="relative">
            {count > 0 && !still && (
              <motion.span
                key={`r${count}`}
                aria-hidden
                className="border-accent absolute inset-0 rounded-full border-2"
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 1.45, opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            )}
            {count > 0 && !still && (
              <motion.span
                key={`h${count}`}
                aria-hidden
                className="bg-accent text-on-accent absolute top-1/2 left-1/2 -mt-4 -ml-4 flex h-8 w-8 items-center justify-center rounded-full"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                animate={{
                  x: [0, travel.x * 0.5, travel.x],
                  y: [0, travel.y * 0.5 - 90, travel.y],
                  opacity: [0, 1, 0],
                  scale: [0.6, 1, 0.7],
                }}
                transition={{ duration: 0.75, delay: 0.25, ease: "easeInOut" }}
              >
                <Heart size={16} weight="fill" />
              </motion.span>
            )}
            <button
              ref={btn}
              type="button"
              onClick={send}
              className="press bg-app border-line-strong hover:border-accent relative flex h-[176px] w-[176px] flex-col items-center justify-center gap-2 rounded-full border-[1.5px] transition-colors sm:h-[200px] sm:w-[200px]"
            >
              <span className="block h-[92px] w-[74px] sm:h-[104px] sm:w-[84px]">
                <Flutes
                  mode="once"
                  playKey={count}
                  still={still || count === 0}
                  className="h-full w-full"
                />
              </span>
              <span className="text-text text-sm font-bold">
                Tap to clink<span className="sr-only"> to Theo</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
