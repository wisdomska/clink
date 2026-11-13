"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface QueuedPayload {
  clientId: string;
  type: "text" | "voice" | "media" | "sticker";
  body?: string;
  replyTo?: string;
  mediaIds?: string[];
  stickerId?: string;
  createdAt: string;
}

interface QueueState {
  items: QueuedPayload[];
  failed: Record<string, boolean>;
  add: (p: QueuedPayload) => void;
  remove: (clientId: string) => void;
  setFailed: (clientId: string, v: boolean) => void;
}

/**
 * CHAT-01 offline send queue. Text and sticker sends survive reloads
 * (localStorage); everything retries automatically when the connection returns.
 * client_id makes every retry idempotent on the server.
 */
export const useQueue = create<QueueState>()(
  persist(
    (set) => ({
      items: [],
      failed: {},
      add: (p) => set((s) => ({ items: [...s.items.filter((i) => i.clientId !== p.clientId), p] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.clientId !== id), failed: { ...s.failed, [id]: false } })),
      setFailed: (id, v) => set((s) => ({ failed: { ...s.failed, [id]: v } })),
    }),
    {
      name: "clink_outbox",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items.filter((i) => i.type === "text" || i.type === "sticker"), failed: {} }),
    },
  ),
);

export function newClientId(): string {
  return crypto.randomUUID();
}
