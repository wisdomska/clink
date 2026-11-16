"use client";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/feedback";

/**
 * Animated 3D characters for onboarding. Rendered from Quaternius CC0 models by
 * scripts/render-characters.mjs into public/characters (see CREDITS.md there).
 * Each name x pose has a looping animated WebP and a still poster.
 */
export const CHARACTER_NAMES = ["ama", "esi", "akosua", "kwame", "kofi", "yaw"] as const;
export const CHARACTER_POSES = [
  "wave",
  "kiss",
  "heart",
  "think",
  "laugh",
  "peace",
  "shocked",
  "thumbs",
  "wink",
  "sleepy",
  "idle",
] as const;
export type CharacterName = (typeof CHARACTER_NAMES)[number];
export type CharacterPose = (typeof CHARACTER_POSES)[number];

export function Character({
  name,
  pose = "idle",
  size = 160,
  alt,
  priority = false,
  className,
}: {
  name: CharacterName;
  pose?: CharacterPose;
  size?: number;
  /** Give alt text only when the character carries meaning; decorative by default. */
  alt?: string;
  /** Load eagerly (above the fold). */
  priority?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const base = `/characters/${name}-${pose}`;
  const poster = `${base}-poster.webp`;
  const decorative = !alt;

  return (
    <motion.picture
      className={className}
      style={{ display: "inline-block", width: size, height: size, lineHeight: 0 }}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={decorative || undefined}
    >
      {/* The OS setting swaps to the still poster even before hydration. */}
      <source media="(prefers-reduced-motion: reduce)" srcSet={poster} type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={reduce ? poster : `${base}.webp`}
        width={size}
        height={size}
        alt={alt ?? ""}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        style={{ width: size, height: size, objectFit: "contain", userSelect: "none" }}
      />
    </motion.picture>
  );
}
