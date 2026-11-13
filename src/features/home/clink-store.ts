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

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS: visual pulse only */
  }
}
