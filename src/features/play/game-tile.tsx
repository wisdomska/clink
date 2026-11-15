"use client";
import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";

/** Per-game glow. Low alpha so Clink's accent still leads. */
export const GAME_TINT: Record<string, string> = {
  know_me: "#FF4F7B",
  draw_guess: "#4FD1C5",
  trivia: "#FFC857",
  wyr: "#8B7CFF",
  rps: "#FF8A5C",
  snap: "#FF6FA8",
  zoom: "#6CB8FF",
  memory: "#9BE15D",
  word: "#FFC857",
  story: "#8B7CFF",
};

/**
 * A game card: soft tinted glow, 3D artwork that lifts and tilts when pressed
 * or hovered, name and a short meta line. "hero" spans two columns.
 */
export function GameTile({
  type,
  name,
  meta,
  onClick,
  hero,
  dim,
  badge,
  index = 0,
  highlight,
}: {
  type: string;
  name: string;
  meta: string;
  onClick: () => void;
  hero?: boolean;
  dim?: boolean;
  badge?: string;
  index?: number;
  highlight?: boolean;
}) {
  const tint = GAME_TINT[type] ?? "#FF4F7B";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0.01, y: 14 }}
      animate={{ opacity: dim ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 380, damping: 30 }}
      whileHover="lift"
      whileTap="press"
      className={cn(
        "group text-text relative flex cursor-pointer overflow-hidden rounded-[28px] border text-left",
        hero
          ? "col-span-2 min-h-[150px] items-center gap-4 p-5"
          : "min-h-[176px] flex-col justify-end p-4",
      )}
      style={{
        borderColor: highlight ? tint : "var(--line)",
        background: `radial-gradient(120% 90% at ${hero ? "85% 30%" : "70% 0%"}, ${tint}33 0%, transparent 60%), linear-gradient(160deg, var(--surface-2), var(--surface-1))`,
      }}
      variants={{ press: { scale: 0.97 }, lift: { y: -2 } }}
    >
      <motion.img
        src={`/art/${type}.webp`}
        alt=""
        aria-hidden
        draggable={false}
        variants={{
          lift: { rotate: -6, y: -4, scale: 1.06 },
          press: { rotate: 4, scale: 0.94 },
        }}
        transition={{ type: "spring", stiffness: 500, damping: 16 }}
        className={cn(
          "pointer-events-none object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,.45)] select-none",
          hero ? "order-2 ml-auto h-24 w-24 flex-none" : "absolute top-3 right-3 h-[72px] w-[72px]",
        )}
      />
      <span className={cn("relative flex min-w-0 flex-col gap-1", hero && "order-1")}>
        <span className={cn("leading-[1.15] font-bold", hero ? "text-[22px]" : "text-[16px]")}>
          {name}
        </span>
        <span className="mono text-[11px] tracking-wide" style={{ color: tint }}>
          {meta}
        </span>
      </span>
      {badge && (
        <span className="bg-accent text-on-accent absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
