"use client";
import { useRef } from "react";
import { Wine } from "@phosphor-icons/react";
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
      <div className="relative h-[188px] w-[188px]">
        {clinking && (
          <>
            <div
              aria-hidden
              className="an-ripple border-accent absolute inset-0 rounded-full border-2"
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
          className="press bg-accent absolute inset-0 flex cursor-pointer touch-none items-center justify-center rounded-full border-0 select-none focus-visible:outline-offset-4 active:scale-[.96]"
        >
          <Wine
            aria-hidden
            size={72}
            className={clinking ? "an-btnL" : ""}
            style={{
              color: "var(--on-accent)",
              marginRight: -14,
              transformOrigin: "50% 90%",
              transform: "rotate(-14deg)",
            }}
          />
          <Wine
            aria-hidden
            size={72}
            className={clinking ? "an-btnR" : ""}
            style={{
              color: "var(--on-accent)",
              marginLeft: -14,
              transformOrigin: "50% 90%",
              transform: "rotate(14deg)",
            }}
          />
        </button>
      </div>
      <div className="display text-[22px]" aria-live="polite">
        {clinking ? "Clink!" : "Send a Clink"}
      </div>
      <div className="text-muted text-sm">
        {streak && streak > 0 ? `${streak}-day streak. ` : ""}Hold to glow together.
      </div>
    </div>
  );
}
