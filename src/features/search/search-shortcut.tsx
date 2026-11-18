"use client";
import { useEffect } from "react";
import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

/** True when the key press is going into a field, so "/" should type a slash. */
export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Desktop shortcut: "/" opens global search from any screen that mounts this.
 * Ignored while typing, with modifier keys, or on touch-only devices.
 */
export function useSearchShortcut(onSlash?: () => void) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target)) return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      e.preventDefault();
      if (onSlash) onSlash();
      else router.push("/search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, onSlash]);
}

/** Mounts the "/" shortcut without rendering anything. */
export function SearchShortcut() {
  useSearchShortcut();
  return null;
}

/** Small header links to Search and Calendar (the "/" shortcut is mounted app-wide). */
export function FindLinks({ className }: { className?: string }) {
  const cls =
    "press-icon border-line bg-s1 text-text hover:text-text flex h-11 w-11 flex-none items-center justify-center rounded-full border";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link href="/search" aria-label="Search" title="Search (press /)" className={cls}>
        <MagnifyingGlass size={20} aria-hidden />
      </Link>
      <Link href="/calendar" aria-label="Calendar" title="Calendar" className={cls}>
        <CalendarBlank size={20} aria-hidden />
      </Link>
    </div>
  );
}
