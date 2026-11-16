"use client";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/feedback";
import { cn } from "@/components/ui/cn";

/** A pose from the 3D character set: gender, pose and skin tone, e.g. ["w", "wave", "md"]. */
export type Pose = readonly [g: "w" | "m", pose: string, tone: string];

/** Each scene's pair: different people, poses and tones so every step feels new. */
export const SCENES = {
  birthday: [
    ["w", "ok", "md"],
    ["m", "sass", "d"],
  ],
  hello: [
    ["w", "wave", "l"],
    ["m", "wave", "k"],
  ],
  avatar: [
    ["m", "artist", "m"],
    ["w", "singer", "d"],
  ],
  city: [
    ["w", "run", "ml"],
    ["m", "tech", "md"],
  ],
  linked: [
    ["w", "dance", "k"],
    ["m", "dance", "l"],
  ],
} as const satisfies Record<string, readonly [Pose, Pose]>;

const src = ([g, pose, tone]: Pose) => `/avatars/p/${g}-${pose}-${tone}.webp`;

/**
 * Two 3D characters for onboarding and linking. They step in from either side,
 * then breathe and sway out of sync so the pair feels alive. Still for reduced motion.
 */
export function PoseDuo({
  scene,
  size = 120,
  className,
}: {
  scene: keyof typeof SCENES;
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [left, right] = SCENES[scene];
  return (
    <div
      aria-hidden
      className={cn("relative flex items-end justify-center", className)}
      style={{ height: size * 1.05 }}
    >
      {([left, right] as const).map((p, i) => {
        const dir = i === 0 ? -1 : 1;
        return (
          <motion.div
            key={`${scene}-${i}`}
            initial={reduced ? false : { opacity: 0, x: dir * 40, y: 12, rotate: dir * 8 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.05 + i * 0.08 }}
            className="relative"
            style={{ width: size, height: size, marginLeft: i ? -size * 0.12 : 0 }}
          >
            <motion.img
              src={src(p)}
              alt=""
              draggable={false}
              width={size}
              height={size}
              className="h-full w-full object-contain select-none"
              style={{ transformOrigin: "50% 100%" }}
              animate={
                reduced
                  ? undefined
                  : { y: [0, -4, 0], rotate: [0, dir * 2.5, 0], scaleY: [1, 1.015, 1] }
              }
              transition={{
                duration: 2.6 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.6 + i * 0.5,
              }}
            />
            {/* Soft contact shadow so they stand on the page. */}
            <span
              className="absolute bottom-0 left-1/2 h-2 w-2/3 -translate-x-1/2 rounded-full bg-black/40 blur-[6px]"
              style={{ zIndex: -1 }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
