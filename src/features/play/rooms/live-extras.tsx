"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { feedback, haptic, playSound } from "@/lib/feedback";

/* ------------------------------------------------------------ reactions */

const EMOTES = ["❤️", "😂", "😮", "🔥", "👏"] as const;
const COOLDOWN_MS = 1200;

interface Bubble {
  n: number;
  emoji: string;
  mine: boolean;
}

/**
 * Live reactions during a game: tap an emoji, it floats up on both screens.
 * Sent over the couple's realtime channel only (never stored). Rate limited.
 */
export function GameReactions({ gameId }: { gameId: string }) {
  const { send } = useCouple();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const last = useRef(0);
  const counter = useRef(0);

  const add = (emoji: string, mine: boolean) => {
    const n = ++counter.current;
    setBubbles((b) => [...b.slice(-6), { n, emoji, mine }]);
    setTimeout(() => setBubbles((b) => b.filter((x) => x.n !== n)), 1600);
  };

  useCoupleEvent("game.emote", (p) => {
    if (p.game !== gameId || typeof p.e !== "string" || !EMOTES.includes(p.e as never)) return;
    add(p.e, false);
    feedback("tap", "pop");
  });

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-24 z-40 h-0">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.span
              key={b.n}
              initial={{ opacity: 0, y: 6, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: [6, 0, -60, -120], scale: [0.6, 1.08, 1, 1] }}
              transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1], times: [0, 0.2, 0.6, 1] }}
              className="absolute bottom-0 text-[34px]"
              style={{ left: `${(b.mine ? 30 : 62) + ((b.n * 13) % 14)}%` }}
            >
              {b.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div
        role="group"
        aria-label="Send a reaction"
        className="border-line bg-s1 mt-auto flex flex-none justify-center gap-1 self-center rounded-full border p-1"
      >
        {EMOTES.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`React ${e}`}
            data-no-tick
            onClick={() => {
              if (Date.now() - last.current < COOLDOWN_MS) return haptic("error");
              last.current = Date.now();
              send("game.emote", { game: gameId, e });
              add(e, true);
              haptic("tap");
            }}
            className="press-icon flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[22px] transition-transform"
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ countdown */

/**
 * 3, 2, 1, Go when a live game starts while you're watching. Each beat slams
 * in with a little tilt; any tap skips it. Reduced motion: fades only.
 */
export function StartCountdown({ status }: { status: string }) {
  const prev = useRef(status);
  const [beat, setBeat] = useState<number | null>(null);

  useEffect(() => {
    const started = prev.current === "invited" && status === "active";
    prev.current = status;
    if (!started) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    [3, 2, 1, 0].forEach((b, i) =>
      timers.push(
        setTimeout(() => {
          setBeat(b);
          if (b === 0) feedback("heavy", "success");
          else {
            haptic("select");
            playSound("flip");
          }
        }, i * 650),
      ),
    );
    timers.push(setTimeout(() => setBeat(null), 4 * 650 + 400));
    const skip = () => {
      timers.forEach(clearTimeout);
      setBeat(null);
    };
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("pointerdown", skip);
    };
  }, [status]);

  return (
    <AnimatePresence>
      {beat !== null && (
        <motion.div
          key="countdown"
          role="status"
          aria-live="assertive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="pointer-events-none fixed inset-0 z-[72] flex items-center justify-center"
          style={{ background: "var(--scrim)" }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={beat}
              initial={{ opacity: 0, scale: 2.2, rotate: 0 }}
              animate={{
                opacity: 1,
                scale: [2.2, 0.92, 1.04, 1],
                rotate: [0, 0, beat % 2 ? 2 : -2, 0],
              }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], times: [0, 0.4, 0.55, 1] }}
              className="display text-accent text-[120px] leading-none"
            >
              {beat === 0 ? "Go" : beat}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
