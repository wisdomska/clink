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
    avatar: "/memoji/w1-callme.webp",
    // Her flute's colour (flutes.tsx), so each person and their glass belong together.
    tint: "var(--accent)",
    // Mirrored so she faces Theo across the clink.
    flip: true,
    lat: 5.6037,
    lon: -0.187,
  },
  {
    zone: "America/New_York",
    place: "New York",
    name: "Theo",
    mood: "Thinking of you",
    avatar: "/memoji/m6-hearthands.webp",
    tint: "#FF7A5C",
    flip: false,
    lat: 40.7128,
    lon: -74.006,
  },
] as const;

/** Great-circle distance, rounded to the nearest 100 km. */
function kmApart() {
  const [a, b] = PEOPLE;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return Math.round((6371 * 2 * Math.asin(Math.sqrt(h))) / 100) * 100;
}
const KM = kmApart();

/** The local hour as a number, or null before the clock is known. */
const hourIn = (minute: number | null, zone: string) =>
  minute === null ? null : Number(clockIn(minute, zone).slice(0, 2));

/** Hours between the two places right now (Theo relative to Ama). */
function gap(minute: number | null) {
  if (minute === null) return null;
  const at = (zone: string) => {
    const [h, m] = clockIn(minute, zone).split(":").map(Number);
    return h! * 60 + m!;
  };
  let d = (at(PEOPLE[1].zone) - at(PEOPLE[0].zone)) / 60;
  if (d > 12) d -= 24;
  if (d < -12) d += 24;
  return d;
}

/**
 * Each half wears its own sky, from the real local time there: warm in the
 * morning, bright-ish by day, dusky in the evening, starry at night. All kept
 * dark (Clink is dark only), just tinted.
 */
function sky(hour: number | null) {
  if (hour === null) return "linear-gradient(180deg, #1b1420 0%, var(--bg-night) 70%)";
  if (hour >= 5 && hour < 10)
    return "radial-gradient(120% 70% at 50% 0%, rgba(255,170,110,.22) 0%, rgba(255,120,120,.08) 45%, transparent 75%), linear-gradient(180deg, #24161c 0%, #160f14 100%)";
  if (hour >= 10 && hour < 17)
    return "radial-gradient(120% 70% at 50% 0%, rgba(255,214,170,.16) 0%, transparent 70%), linear-gradient(180deg, #221a1f 0%, #171115 100%)";
  if (hour >= 17 && hour < 21)
    return "radial-gradient(120% 70% at 50% 0%, rgba(255,110,140,.22) 0%, rgba(140,80,200,.10) 50%, transparent 80%), linear-gradient(180deg, #221425 0%, #140d14 100%)";
  return "radial-gradient(120% 70% at 50% 0%, rgba(120,110,255,.14) 0%, transparent 70%), linear-gradient(180deg, #120f22 0%, #0d0a14 100%)";
}
const isNight = (hour: number | null) => hour !== null && (hour >= 21 || hour < 5);

// A few fixed stars (no randomness: the server and the device draw the same sky).
const STARS = [
  [12, 14, 1.5],
  [28, 8, 1],
  [44, 20, 1.5],
  [70, 10, 1],
  [84, 26, 2],
  [58, 32, 1],
  [20, 38, 1],
  [76, 44, 1.5],
  [36, 52, 1],
  [90, 58, 1],
] as const;

/**
 * Hero visual: two people, each in their own city and sky. Their portraits
 * sit in a soft circle in their glass's colour, head breaking out of the top
 * (contact-poster style), facing each other. Two flutes swing in and clink in
 * the middle, and the toast lands on the other side. Holds the resting pose
 * for reduced motion.
 */
export function HeroScene() {
  const minute = useMinute();
  const still = useStill();
  const hours = gap(minute);

  return (
    <figure
      className="rounded-card border-line relative m-0 grid h-[420px] grid-cols-2 overflow-hidden border sm:h-[500px] lg:h-[min(640px,calc(100dvh-160px))] lg:min-h-[520px]"
      aria-label={`Ama in Accra and Theo in New York, about ${KM.toLocaleString("en-GB")} km apart, clinking glasses.`}
    >
      {PEOPLE.map((c, i) => {
        const right = i === 1;
        const hour = hourIn(minute, c.zone);
        return (
          <div
            key={c.name}
            aria-hidden
            className={cn(
              "relative flex flex-col justify-between overflow-hidden p-4 transition-[background] duration-700 sm:p-6 lg:p-8",
              right ? "items-end text-right" : "items-start",
            )}
            style={{ background: sky(hour) }}
          >
            {isNight(hour) && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                {STARS.map(([x, y, r], k) => (
                  <circle
                    key={k}
                    cx={`${right ? x : 100 - x}%`}
                    cy={`${y}%`}
                    r={r}
                    fill="#fff"
                    opacity={0.35 + (k % 3) * 0.15}
                  />
                ))}
              </svg>
            )}

            <div className={cn("relative flex flex-col gap-1", right && "items-end")}>
              <span className="display text-text text-[22px] leading-none sm:text-[28px] lg:text-[36px]">
                {c.place}
              </span>
              <span className="mono text-muted text-sm sm:text-base">
                {minute === null ? "--:--" : clockIn(minute, c.zone)}
              </span>
            </div>

            {/* The person: portrait, then name and mood, as one unit on the outer edge. */}
            <div
              className={cn("relative flex flex-col gap-3", right ? "items-end" : "items-start")}
            >
              <div
                className="relative h-[112px] w-[112px] sm:h-[148px] sm:w-[148px] lg:h-[184px] lg:w-[184px]"
                style={{ ["--tint" as string]: c.tint }}
              >
                {/* The frame: a soft disc and a fine ring in their colour. */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--tint) 38%, transparent) 0%, color-mix(in oklab, var(--tint) 14%, transparent) 55%, color-mix(in oklab, var(--tint) 6%, transparent) 100%)",
                    boxShadow:
                      "inset 0 0 0 1.5px color-mix(in oklab, var(--tint) 55%, transparent), 0 18px 40px -12px color-mix(in oklab, var(--tint) 45%, transparent)",
                  }}
                />
                {/* The bust, cropped by the disc at the bottom, head free above it. */}
                <div
                  className="absolute inset-x-[-4%] bottom-0 h-[140%]"
                  style={{
                    clipPath: "inset(-20% 3.7% 0 3.7% round 0 0 999px 999px)",
                  }}
                >
                  <Image
                    src={c.avatar}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 236px, (min-width: 640px) 190px, 144px"
                    className="object-contain object-bottom drop-shadow-[0_8px_14px_rgba(0,0,0,.35)]"
                    style={c.flip ? { transform: "scaleX(-1)" } : undefined}
                    priority
                  />
                </div>
              </div>
              <div className={cn("flex flex-col gap-1.5", right ? "items-end" : "items-start")}>
                <span className="text-text flex items-center gap-2 text-[22px] leading-none font-bold sm:text-[26px] lg:text-[30px]">
                  {right && <OnlineDot />}
                  {c.name}
                  {!right && <OnlineDot />}
                </span>
                <span className="text-muted text-sm leading-snug sm:text-base">{c.mood}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* The seam between the two of you. */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, var(--line) 18%, var(--line) 82%, transparent 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[148px] w-[118px] -translate-x-1/2 -translate-y-[56%] sm:h-[196px] sm:w-[156px] lg:h-[236px] lg:w-[188px]"
      >
        <Flutes mode="loop" still={still} className="h-full w-full" />
      </div>

      {/* How far apart they are, on the seam itself. */}
      <div
        aria-hidden
        className="border-line bg-app/85 text-muted mono absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] whitespace-nowrap backdrop-blur-sm sm:bottom-6 sm:block sm:text-xs lg:bottom-8"
      >
        {KM.toLocaleString("en-GB")} km
        {hours !== null &&
          hours !== 0 &&
          ` · ${Math.abs(hours)} h ${hours < 0 ? "behind" : "ahead"}`}
      </div>

      {/* Lands on Theo's side just after the glasses touch. */}
      <motion.div
        aria-hidden
        className="bg-s3/90 border-line text-text absolute top-[84px] right-3 flex items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-xs font-medium backdrop-blur-sm sm:top-[108px] sm:right-6 sm:text-sm lg:top-[128px] lg:right-8"
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

function OnlineDot() {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden>
      <span className="bg-online absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping" />
      <span className="bg-online relative h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-night)]" />
    </span>
  );
}
