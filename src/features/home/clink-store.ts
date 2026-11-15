"use client";
import { create } from "zustand";

interface ClinkState {
  incoming: { kind: string; at: number } | null;
  partnerHolding: boolean;
  setIncoming: (v: ClinkState["incoming"]) => void;
  setPartnerHolding: (v: boolean) => void;
}

export const useClinkStore = create<ClinkState>((set) => ({
  incoming: null,
  partnerHolding: false,
  setIncoming: (incoming) => set({ incoming }),
  setPartnerHolding: (partnerHolding) => set({ partnerHolding }),
}));

/** Kept for existing callers; goes through the shared, reduced-motion-aware helper. */
export { haptic as vibrate } from "@/lib/feedback";
