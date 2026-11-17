"use client";
import { useId, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  vertical,
}: {
  tabs: readonly NavTab<T>[];
  label: string;
  param?: string;
  className?: string;
  /** A side menu on desktop (lg+) instead of a row of pills. */
  vertical?: boolean;
}) {
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
    // Native replaceState syncs useSearchParams without a server round trip, so
    // the pill and panel switch on the same frame as the tap. (router.replace
    // re-fetched the page's RSC payload first, which waited on the network.)
    window.history.replaceState(null, "", `${pathname}${next.size ? `?${next}` : ""}`);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={vertical ? undefined : "horizontal"}
      className={cn(
        "no-scrollbar border-line bg-s1 -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full border p-1",
        vertical &&
          "lg:mx-0 lg:flex-col lg:overflow-visible lg:rounded-[22px] lg:border-0 lg:bg-transparent lg:p-0",
        className,
      )}
      onKeyDown={(e) => {
        const i = tabs.findIndex((t) => t.value === active);
        const d =
          e.key === "ArrowRight" || e.key === "ArrowDown"
            ? 1
            : e.key === "ArrowLeft" || e.key === "ArrowUp"
              ? -1
              : 0;
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
              "relative flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-100",
              vertical && "lg:h-12 lg:w-full lg:justify-start lg:px-5 lg:text-[15px]",
              on ? "text-on-accent" : "text-muted hover:text-text",
              vertical && !on && "lg:hover:bg-s1",
            )}
          >
            {on && (
              <motion.span
                layoutId={`navtab-${label}`}
                className="bg-accent absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 700, damping: 45, mass: 0.6 }}
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

/** Wraps a tab's content with a quick entrance (140 ms, never blocks input) each time it is shown. */
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
      initial={{ opacity: 0.01, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
