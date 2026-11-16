"use client";
import { create } from "zustand";

interface ClinkState {
  incoming: { kind: string; at: number } | null;
  partnerHolding: boolean;
  setIncoming: (v: ClinkState["incoming"]) => void;
  setPartnerHolding: (v: boolean) => void;
}

// A holding partner re-announces every 2 s. If that stops (closed tab, lost
// connection, missed "let go"), the hold quietly expires instead of sticking.
let expiry: ReturnType<typeof setTimeout> | undefined;

export const useClinkStore = create<ClinkState>((set) => ({
  incoming: null,
  partnerHolding: false,
  setIncoming: (incoming) => set({ incoming }),
  setPartnerHolding: (partnerHolding) => {
    clearTimeout(expiry);
    if (partnerHolding) expiry = setTimeout(() => set({ partnerHolding: false }), 5000);
    set({ partnerHolding });
  },
}));

/** Kept for existing callers; goes through the shared, reduced-motion-aware helper. */
export { haptic as vibrate } from "@/lib/feedback";
