"use client";
import { create } from "zustand";
import { useEffect, useState } from "react";
import { CheckCircle, WarningCircle, Info } from "@phosphor-icons/react";
import { haptic } from "@/lib/feedback";
import { cn } from "./cn";

type Kind = "plain" | "ok" | "err" | "info";
export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface ToastOptions {
  /** A button in the toast, e.g. `{ label: "Undo", onClick }`. Toasts with one stay 5 s. */
  action?: ToastAction;
  kind?: Kind;
  /** Called when the toast leaves without its action being pressed (timeout or replaced). */
  onDismiss?: () => void;
  /** Override how long it stays, in ms. */
  duration?: number;
}
interface ToastState {
  message: string;
  kind: Kind;
  action: ToastAction | null;
  onDismiss: (() => void) | null;
  duration: number | null;
  id: number;
  show: (m: string, kind?: Kind, action?: ToastAction | null, opts?: ToastOptions) => void;
  clear: () => void;
}

export const useToast = create<ToastState>((set, get) => ({
  message: "",
  kind: "plain",
  action: null,
  onDismiss: null,
  duration: null,
  id: 0,
  show: (message, kind = "plain", action = null, opts) => {
    // A toast that gets replaced counts as dismissed (an Undo window closes).
    get().onDismiss?.();
    set((s) => ({
      message,
      kind,
      action,
      onDismiss: opts?.onDismiss ?? null,
      duration: opts?.duration ?? null,
      id: s.id + 1,
    }));
  },
  clear: () => {
    get().onDismiss?.();
    set({ message: "", action: null, onDismiss: null, duration: null });
  },
}));

function show(m: string, kind: Kind, opts?: ToastOptions) {
  if (kind === "err") haptic("error");
  useToast.getState().show(m, opts?.kind ?? kind, opts?.action ?? null, opts);
}

/**
 * `toast("Saved.")` stays the default; kinds add an icon. Reversible actions get
 * an Undo instead of a confirm dialog:
 * `toast("Removed.", { action: { label: "Undo", onClick: restore }, onDismiss: commit })`.
 */
export const toast = Object.assign((m: string, opts?: ToastOptions) => show(m, "plain", opts), {
  ok: (m: string, opts?: ToastOptions) => show(m, "ok", opts),
  err: (m: string, opts?: ToastOptions) => show(m, "err", opts),
  info: (m: string, opts?: ToastOptions) => show(m, "info", opts),
  /** Kept for existing callers: same as `toast(m, { action })`. */
  withAction: (m: string, action: ToastAction) => show(m, "plain", { action }),
});

const ICON = { ok: CheckCircle, err: WarningCircle, info: Info } as const;
const COLOUR = { ok: "text-accent", err: "text-danger", info: "text-muted" } as const;

/** Pill toast above the tab bar on phones, bottom-right on desktop. Re-showing restarts the timer. */
export function Toaster() {
  const { message, kind, action, duration, id, clear } = useToast();
  // Which toast is on its way out: it fades down for 140 ms, then unmounts.
  const [leaving, setLeaving] = useState<number | null>(null);
  useEffect(() => {
    if (!message) return;
    const total = duration ?? (action ? 5000 : 2600);
    const out = setTimeout(() => setLeaving(id), Math.max(0, total - 140));
    const t = setTimeout(clear, total);
    return () => {
      clearTimeout(out);
      clearTimeout(t);
    };
  }, [message, id, clear, action, duration]);
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
            "border-line bg-s3 text-text flex max-w-[360px] items-center gap-2.5 rounded-full border py-3 text-sm font-medium",
            leaving === id ? "an-toast-out" : "an-toast",
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
                // Pressing the action is not a dismissal: drop onDismiss first.
                useToast.setState({ onDismiss: null });
                haptic("tap");
                action.onClick();
                clear();
              }}
              className="press text-accent hover:bg-s2 -my-2 ml-1 h-11 min-w-11 cursor-pointer rounded-full px-3.5 text-sm font-bold"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
