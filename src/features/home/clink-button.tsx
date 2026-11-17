"use client";
import { motion } from "motion/react";
import { useRef } from "react";
import { Sparks } from "@/components/clink/sparks";
import { useSendClink } from "./use-send-clink";
import { useHold } from "./hold-together";

/**
 * The Clink button: two glasses tilt and touch, a ring ripples out, 8 sparks
 * burst. Press and hold 550 ms for hold-together. Enter/Space sends.
 */
export function ClinkButton({ streak }: { streak: number | null }) {
  const { sendClink, clinking } = useSendClink();
  const startHold = useHold((s) => s.start);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const down = () => {
    held.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      held.current = true;
      startHold();
    }, 550);
  };
  const up = () => {
    if (timer.current) clearTimeout(timer.current);
    if (!held.current) void sendClink("tap");
    held.current = false;
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <div className="flex flex-none flex-col items-center gap-2.5 pt-3 pb-1">
      <div className="relative h-[188px] w-[188px] lg:h-[220px] lg:w-[220px]">
        {clinking && (
          <>
            <motion.div
              aria-hidden
              className="border-accent absolute inset-0 rounded-[64px] border-2"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.25, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <Sparks variant="spark-btn" length={12} className="top-1/2 left-1/2" />
          </>
        )}
        <button
          type="button"
          onPointerDown={down}
          onPointerUp={up}
          onPointerLeave={cancel}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void sendClink("tap");
            }
          }}
          aria-label="Send a Clink. Hold to glow together."
          className="press bg-accent absolute inset-0 flex cursor-pointer touch-none items-center justify-center rounded-[64px] border-0 select-none focus-visible:outline-offset-4"
        >
          <motion.img
            src="/stickers/clink.webp"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none h-[112px] w-[112px] object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,.35)] select-none lg:h-[132px] lg:w-[132px]"
            animate={
              clinking ? { rotate: [0, -10, 8, 0], scale: [1, 1.06, 1] } : { rotate: 0, scale: 1 }
            }
            transition={{ duration: 0.45 }}
          />
        </button>
      </div>
      <div className="display text-[22px] lg:text-[26px]" aria-live="polite">
        {clinking ? "Clink!" : "Send a Clink"}
      </div>
      <div className="text-muted text-sm">
        {streak && streak > 0 ? `${streak}-day streak. ` : ""}Hold to glow together.
      </div>
    </div>
  );
}
