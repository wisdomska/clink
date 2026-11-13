"use client";
import { create } from "zustand";
import { useEffect } from "react";

interface ToastState {
  message: string;
  id: number;
  show: (m: string) => void;
  clear: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: "",
  id: 0,
  show: (message) => set((s) => ({ message, id: s.id + 1 })),
  clear: () => set({ message: "" }),
}));

export const toast = (m: string) => useToast.getState().show(m);

/** Pill toast, 2.4 s, sits above the tab bar when it is visible. */
export function Toaster() {
  const { message, id, clear } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, 2400);
    return () => clearTimeout(t);
  }, [message, id, clear]);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ bottom: "var(--toast-bottom, 40px)" }}
    >
      {message && (
        <div
          key={id}
          className="an-toast max-w-[320px] rounded-full border border-line bg-s3 px-[18px] py-3 text-center text-sm font-medium text-text"
          style={{ boxShadow: "var(--shadow-toast)" }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
