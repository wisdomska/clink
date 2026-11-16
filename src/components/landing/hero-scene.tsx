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
    name: "Ama",
    mood: "Feeling flirty",
    avatar: "/avatars/woman_dark.webp",
  },
  {
    zone: "Europe/London",
    name: "Theo",
    mood: "Thinking of you",
    avatar: "/avatars/man_light.webp",
  },
] as const;

/**
 * Hero visual: two people side by side, each with their mood and local time.
 * Two flutes swing in from either side and clink in the middle, and the toast
 * lands on the other side. Holds the resting pose for reduced motion.
 */
export function HeroScene() {
  const minute = useMinute();
  const still = useStill();

  return (
    <figure
      className="rounded-card border-line relative m-0 grid h-[380px] grid-cols-2 overflow-hidden border sm:h-[460px] lg:h-[min(620px,calc(100dvh-180px))] lg:min-h-[480px]"
      aria-label="Ama and Theo clinking glasses."
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
            <div className={cn("flex flex-col gap-3", right && "items-end")}>
              <Image
                src={c.avatar}
                alt=""
                width={72}
                height={72}
                className="bg-s2 h-14 w-14 rounded-full sm:h-[72px] sm:w-[72px]"
              />
              <div className="display text-text text-[34px] leading-none sm:text-[52px] lg:text-[64px]">
                {c.name}
              </div>
              <span className="border-line bg-s2 text-text rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm">
                {c.mood}
              </span>
            </div>
            <span className="mono text-faint text-xs sm:text-sm">
              {minute === null ? "--:--" : clockIn(minute, c.zone)} their time
            </span>
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
        className="bg-s3 border-line text-text absolute right-3 bottom-[64px] flex items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-xs font-medium sm:right-6 sm:bottom-[84px] sm:text-sm lg:right-8 lg:bottom-[96px]"
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
