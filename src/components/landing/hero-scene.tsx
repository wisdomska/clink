"use client";
import Image from "next/image";
import { motion } from "motion/react";
import { Heart } from "@phosphor-icons/react";
import { Flutes, LOOP, TOUCH_AT } from "./flutes";
import { clockIn, useMinute } from "./use-minute";
import { useStill } from "./use-still";
import { cn } from "@/components/ui/cn";

const PEOPLE = [
  {
    zone: "Africa/Accra",
    place: "Accra",
    name: "Ama",
    mood: "Feeling flirty",
    avatar: "/memoji/w1-hearteyes.webp",
  },
  {
    zone: "America/New_York",
    place: "New York",
    name: "Theo",
    mood: "Thinking of you",
    avatar: "/memoji/m6-hearthands.webp",
  },
] as const;

/**
 * Hero visual: two people side by side: where they are and their local time on
 * top, the person (avatar, name, mood) at the bottom.
 * Two flutes swing in from either side and clink in the middle, and the toast
 * lands on the other side. Holds the resting pose for reduced motion.
 */
export function HeroScene() {
  const minute = useMinute();
  const still = useStill();

  return (
    <figure
      className="rounded-card border-line relative m-0 grid h-[380px] grid-cols-2 overflow-hidden border sm:h-[460px] lg:h-[min(620px,calc(100dvh-180px))] lg:min-h-[480px]"
      aria-label="Ama in Accra and Theo in New York clinking glasses."
    >
      {PEOPLE.map((c, i) => {
        const right = i === 1;
        return (
          <div
            key={c.name}
            aria-hidden
            className={cn(
              "relative flex flex-col justify-between p-4 sm:p-6 lg:p-8",
              right ? "bg-s1 items-end text-right" : "items-start bg-[var(--bg-night)]",
            )}
          >
            <div className={cn("flex flex-col gap-1", right && "items-end")}>
              <span className="display text-text text-[24px] leading-none sm:text-[32px] lg:text-[40px]">
                {c.place}
              </span>
              <span className="mono text-muted text-sm sm:text-base">
                {minute === null ? "--:--" : clockIn(minute, c.zone)}
              </span>
            </div>
            <div className={cn("flex flex-col gap-2.5", right && "items-end")}>
              <div className="flex items-center gap-3">
                <Image
                  src={c.avatar}
                  alt=""
                  width={56}
                  height={56}
                  className="bg-s2 h-11 w-11 flex-none rounded-full object-contain p-[8%] sm:h-14 sm:w-14"
                />
                <span className="text-text text-[20px] leading-none font-bold sm:text-[26px] lg:text-[30px]">
                  {c.name}
                </span>
              </div>
              <span className="border-line bg-s2 text-text rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm">
                {c.mood}
              </span>
            </div>
          </div>
        );
      })}

      {/* The seam between the two of you. */}
      <div aria-hidden className="bg-line absolute inset-y-0 left-1/2 w-px" />

      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[148px] w-[118px] -translate-x-1/2 -translate-y-[46%] sm:h-[200px] sm:w-[160px] lg:h-[248px] lg:w-[198px]"
      >
        <Flutes mode="loop" still={still} className="h-full w-full" />
      </div>

      {/* Lands on Theo's side just after the glasses touch. */}
      <motion.div
        aria-hidden
        className="bg-s3 border-line text-text absolute top-[84px] right-3 flex items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-xs font-medium sm:top-[108px] sm:right-6 sm:text-sm lg:top-[128px] lg:right-8"
        initial={still ? false : { opacity: 0, y: 10 }}
        animate={
          still ? { opacity: 1, y: 0 } : { opacity: [0, 0, 1, 1, 0, 0], y: [10, 10, 0, 0, 0, 10] }
        }
        transition={
          still ? undefined : { ...LOOP, times: [0, TOUCH_AT + 0.03, TOUCH_AT + 0.1, 0.8, 0.86, 1] }
        }
      >
        <span className="bg-accent text-on-accent flex h-5 w-5 items-center justify-center rounded-full">
          <Heart size={12} weight="fill" />
        </span>
        Ama sent a clink
      </motion.div>
    </figure>
  );
}
