"use client";
import { useId, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "./cn";
import { feedback } from "@/lib/feedback";

export interface NavTab<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

/**
 * Tabs for splitting a long page. The active tab lives in the URL (?tab=),
 * so reload, Back and shared links land on the same view. A Rouge pill slides
 * between tabs; arrow keys move focus the way screen-reader users expect.
 */
export function useTab<T extends string>(tabs: readonly NavTab<T>[], param = "tab"): T {
  const params = useSearchParams();
  const v = params.get(param) as T | null;
  return tabs.some((t) => t.value === v) ? (v as T) : tabs[0]!.value;
}

export function NavTabs<T extends string>({
  tabs,
  label,
  param = "tab",
  className,
}: {
  tabs: readonly NavTab<T>[];
  label: string;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = useTab(tabs, param);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function go(v: T) {
    if (v === active) return;
    feedback("select");
    const next = new URLSearchParams(params);
    if (v === tabs[0]!.value) next.delete(param);
    else next.set(param, v);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar border-line bg-s1 -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full border p-1",
        className,
      )}
      onKeyDown={(e) => {
        const i = tabs.findIndex((t) => t.value === active);
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = (i + d + tabs.length) % tabs.length;
        go(tabs[n]!.value);
        refs.current[n]?.focus();
      }}
    >
      {tabs.map((t, i) => {
        const on = t.value === active;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-${t.value}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => go(t.value)}
            className={cn(
              "relative flex h-10 flex-none cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-4 text-sm font-semibold whitespace-nowrap transition-colors",
              on ? "text-on-accent" : "text-muted hover:text-text",
            )}
          >
            {on && (
              <motion.span
                layoutId={`navtab-${label}`}
                className="bg-accent absolute inset-0 rounded-full shadow-[0_6px_20px_-6px_var(--accent)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={cn(
                    "mono rounded-full px-1.5 text-[11px] leading-[18px]",
                    on ? "bg-on-accent/15" : "bg-s3 text-text",
                  )}
                >
                  {t.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Wraps a tab's content with a soft entrance each time it is shown. */
export function TabPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
