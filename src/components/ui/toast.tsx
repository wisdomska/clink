"use client";
import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle, WarningCircle, Info } from "@phosphor-icons/react";
import { haptic } from "@/lib/feedback";
import { cn } from "./cn";

type Kind = "plain" | "ok" | "err" | "info";
interface Action {
  label: string;
  onClick: () => void;
}
interface ToastState {
  message: string;
  kind: Kind;
  action: Action | null;
  id: number;
  show: (m: string, kind?: Kind, action?: Action | null) => void;
  clear: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: "",
  kind: "plain",
  action: null,
  id: 0,
  show: (message, kind = "plain", action = null) =>
    set((s) => ({ message, kind, action, id: s.id + 1 })),
  clear: () => set({ message: "", action: null }),
}));

/** `toast("Saved.")` stays the default; kinds add an icon, `withAction` adds a button (Undo). */
export const toast = Object.assign((m: string) => useToast.getState().show(m), {
  ok: (m: string) => useToast.getState().show(m, "ok"),
  err: (m: string) => {
    haptic("error");
    useToast.getState().show(m, "err");
  },
  info: (m: string) => useToast.getState().show(m, "info"),
  withAction: (m: string, action: Action) => useToast.getState().show(m, "plain", action),
});

const ICON = { ok: CheckCircle, err: WarningCircle, info: Info } as const;
const COLOUR = { ok: "text-accent", err: "text-danger", info: "text-muted" } as const;

/** Pill toast above the tab bar on phones, bottom-right on desktop. Re-showing restarts the timer. */
export function Toaster() {
  const { message, kind, action, id, clear } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [message, id, clear, action]);
  const Icon = kind === "plain" ? null : ICON[kind];
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4 lg:right-6 lg:left-auto lg:justify-end"
      style={{ bottom: "var(--toast-bottom, 40px)" }}
    >
      {message && (
        <div
          key={id}
          className={cn(
            "an-toast border-line bg-s3 text-text flex max-w-[360px] items-center gap-2.5 rounded-full border py-3 text-sm font-medium",
            action ? "pointer-events-auto pr-2 pl-[18px]" : "px-[18px]",
          )}
          style={{ boxShadow: "var(--shadow-toast)" }}
        >
          {Icon && (
            <Icon
              size={18}
              weight="fill"
              className={cn("flex-none", COLOUR[kind as keyof typeof COLOUR])}
              aria-hidden
            />
          )}
          <span className="text-left">{message}</span>
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                clear();
              }}
              className="press text-accent hover:bg-s2 -my-1 ml-1 h-9 cursor-pointer rounded-full px-3 text-sm font-bold"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
