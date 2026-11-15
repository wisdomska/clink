"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useDragControls, useMotionValue, animate } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { haptic } from "@/lib/feedback";
import { cn } from "./cn";

/**
 * Bottom sheet from the prototype: scrim rgba(15,14,17,.75), 20 px top radius,
 * --surface-1, sheetUp 360 ms drawer easing. Becomes a centred dialog from 768 px.
 * On phones, pull the handle down (or flick it) to dismiss.
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
  initialFocus,
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
  /** Element to focus when the sheet opens (defaults to the first focusable). */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const controls = useDragControls();
  const y = useMotionValue(0);
  const draggable = handle && dismissable && !reduced;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (dismissable || v ? onOpenChange(v) : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="an-fade fixed inset-0 z-[60]"
          style={{ background: scrim === "strong" ? "var(--scrim-strong)" : "var(--scrim)" }}
        />
        <Dialog.Content
          asChild
          onOpenAutoFocus={(e) => {
            y.set(0);
            if (!initialFocus?.current) return;
            e.preventDefault();
            initialFocus.current.focus();
          }}
          onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
          onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
        >
          <motion.div
            drag={draggable ? "y" : false}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) {
                haptic("tap");
                onOpenChange(false);
              } else {
                void animate(y, 0, { type: "spring", stiffness: 500, damping: 40 });
              }
            }}
            style={{ y, boxShadow: "var(--shadow-sheet)" }}
            className={cn(
              "an-sheet border-line bg-s1 fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-[20px] border-t px-5 pt-6 pb-[calc(36px+env(safe-area-inset-bottom))] outline-none",
              "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px] md:border md:pb-8",
              className,
            )}
          >
            {handle && (
              <div
                aria-hidden
                onPointerDown={(e) => draggable && controls.start(e)}
                className="-mx-5 -mt-6 flex h-7 flex-none cursor-grab touch-none items-center justify-center active:cursor-grabbing md:hidden"
              >
                <div className="bg-line-strong h-1 w-10 rounded-full" />
              </div>
            )}
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
            {children}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
