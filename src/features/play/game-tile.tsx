"use client";
import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";

/**
 * A game card: solid surface, 3D artwork, name and a short meta line.
 * "hero" spans two columns.
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
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0.01, y: 14 }}
      animate={{ opacity: dim ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 380, damping: 30 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group rounded-card bg-s1 text-text hover:bg-s2 relative flex cursor-pointer overflow-hidden border text-left transition-colors",
        highlight ? "border-accent border-[1.5px]" : "border-line",
        hero
          ? "col-span-2 min-h-[150px] items-center gap-4 p-5"
          : "min-h-[176px] flex-col justify-end p-4",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/art/${type}.webp`}
        alt=""
        aria-hidden
        draggable={false}
        className={cn(
          "pointer-events-none object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.4)] select-none",
          hero ? "order-2 ml-auto h-24 w-24 flex-none" : "absolute top-3 right-3 h-[72px] w-[72px]",
        )}
      />
      <span className={cn("relative flex min-w-0 flex-col gap-1", hero && "order-1")}>
        <span className={cn("leading-[1.15] font-bold", hero ? "text-[22px]" : "text-[16px]")}>
          {name}
        </span>
        <span className="text-muted text-[13px]">{meta}</span>
      </span>
      {badge && (
        <span className="bg-accent text-on-accent absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
