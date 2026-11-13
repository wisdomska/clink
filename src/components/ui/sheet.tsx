"use client";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Bottom sheet from the prototype: scrim rgba(15,14,17,.75), 20 px top radius,
 * --surface-1, sheetUp 360 ms drawer easing. Becomes a centred dialog from 768 px.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  handle = false,
  scrim = "default",
  dismissable = true,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  handle?: boolean;
  scrim?: "default" | "strong";
  dismissable?: boolean;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => (dismissable || v ? onOpenChange(v) : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="an-fade fixed inset-0 z-[60]"
          style={{ background: scrim === "strong" ? "var(--scrim-strong)" : "var(--scrim)" }}
        />
        <Dialog.Content
          onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
          onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
          className={cn(
            "an-sheet fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-[20px] border-t border-line bg-s1 px-5 pt-6 pb-[calc(36px+env(safe-area-inset-bottom))] outline-none",
            "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px] md:border md:pb-8",
            className,
          )}
          style={{ boxShadow: "var(--shadow-sheet)" }}
        >
          {handle && <div aria-hidden className="-mt-2.5 h-1 w-10 self-center rounded-full bg-line md:hidden" />}
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
