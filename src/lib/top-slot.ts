"use client";
import { useEffect } from "react";
import { create } from "zustand";

/**
 * The top of the screen holds one card at a time. Higher priority wins; the
 * others wait their turn instead of stacking on top of each other.
 */
const PRIORITY = ["clink", "invite", "push"] as const;
export type SlotId = (typeof PRIORITY)[number];

const useSlots = create<{ wanting: SlotId[]; set: (w: SlotId[]) => void }>((set) => ({
  wanting: [],
  set: (wanting) => set({ wanting }),
}));

export function useTopSlot(id: SlotId, want: boolean): boolean {
  const wanting = useSlots((s) => s.wanting);
  useEffect(() => {
    if (!want) return;
    const { wanting: w, set } = useSlots.getState();
    if (!w.includes(id)) set([...w, id]);
    return () => {
      const { wanting: now, set: s } = useSlots.getState();
      s(now.filter((x) => x !== id));
    };
  }, [id, want]);
  if (!want) return false;
  const winner = PRIORITY.find((p) => wanting.includes(p));
  return winner === id;
}
