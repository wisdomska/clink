"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/toast";
import type { CursorPage } from "./cursor";

export type CursorData<T> = InfiniteData<CursorPage<T>, string | null>;

/** GET a cursor page from one of our list routes, throwing the route's message on failure. */
export async function getPage<T>(
  url: string,
  cursor: string | null,
  params: Record<string, string> = {},
): Promise<CursorPage<T>> {
  const q = new URLSearchParams(params);
  if (cursor) q.set("cursor", cursor);
  const qs = q.toString();
  const r = await fetch(qs ? `${url}?${qs}` : url);
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Object.assign(new Error(d.message ?? "Couldn't load that."), { status: r.status });
  return d as CursorPage<T>;
}

/**
 * Infinite list over a cursor API. A stable key plus a staleTime means coming
 * back to a screen shows every page already loaded, so the scroll position can
 * be restored instead of starting from the top.
 */
export function useCursorList<T>({
  queryKey,
  fetchPage,
  enabled = true,
  staleTime = 60_000,
}: {
  queryKey: QueryKey;
  fetchPage: (cursor: string | null) => Promise<CursorPage<T>>;
  enabled?: boolean;
  staleTime?: number;
}) {
  return useInfiniteQuery({
    queryKey,
    enabled,
    staleTime,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (last: CursorPage<T>) => last.nextCursor ?? undefined,
  });
}

export function flatItems<T>(data: InfiniteData<CursorPage<T>, unknown> | undefined): T[] {
  return data?.pages.flatMap((p) => p.items) ?? [];
}

/** Optimistically rewrite the loaded pages of a list. Returns the snapshot to roll back to. */
export async function editList<T>(
  qc: QueryClient,
  key: QueryKey,
  fn: (items: T[], pageIndex: number) => T[],
) {
  await qc.cancelQueries({ queryKey: key });
  const prev = qc.getQueryData<CursorData<T>>(key);
  if (prev) {
    qc.setQueryData<CursorData<T>>(key, {
      ...prev,
      pages: prev.pages.map((p, i) => ({ ...p, items: fn(p.items, i) })),
    });
  }
  return prev;
}

/** Put an item at the top of the first page (or seed the list if nothing is loaded yet). */
export async function prependTo<T>(qc: QueryClient, key: QueryKey, item: T) {
  await qc.cancelQueries({ queryKey: key });
  const prev = qc.getQueryData<CursorData<T>>(key);
  qc.setQueryData<CursorData<T>>(
    key,
    prev
      ? {
          ...prev,
          pages: prev.pages.map((p, i) => (i === 0 ? { ...p, items: [item, ...p.items] } : p)),
        }
      : { pages: [{ items: [item], nextCursor: null }], pageParams: [null] },
  );
  return prev;
}

export function rollback<T>(qc: QueryClient, key: QueryKey, snapshot: CursorData<T> | undefined) {
  if (snapshot) qc.setQueryData(key, snapshot);
  else void qc.invalidateQueries({ queryKey: key });
}

interface PagerQuery {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  fetchNextPage: () => unknown;
}

/**
 * Infinite-scroll sentinel with a visible "Load more" button as the fallback
 * (keyboard users, no IntersectionObserver, or a failed fetch). Renders the
 * skeleton while the next page loads.
 */
export function LoadMore({
  query,
  skeleton,
  label = "Load more",
  horizontal,
  className,
}: {
  query: PagerQuery;
  skeleton?: ReactNode;
  label?: string;
  /** Inside a horizontal scroller: observe sideways and keep the button compact. */
  horizontal?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = query;
  const auto = hasNextPage && !isFetchingNextPage && !isError;

  useEffect(() => {
    const el = ref.current;
    if (!el || !auto || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: horizontal ? "0px 400px 0px 0px" : "0px 0px 600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [auto, fetchNextPage, horizontal]);

  if (!hasNextPage && !isFetchingNextPage) return null;
  return (
    <div
      ref={ref}
      className={cn(horizontal ? "flex flex-none items-center" : "flex flex-col gap-3", className)}
    >
      {isFetchingNextPage && skeleton}
      {!isFetchingNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className={horizontal ? undefined : "self-center"}
          onClick={() => void fetchNextPage()}
        >
          {isError ? "Couldn't load. Try again" : label}
        </Button>
      )}
    </div>
  );
}

/** Generic row skeletons for grouped-row lists (one card, hairline dividers). */
export function SkeletonRows({ count = 3, tall }: { count?: number; tall?: boolean }) {
  return (
    <div
      aria-hidden
      className="rounded-card border-line bg-s1 divide-line flex flex-col divide-y overflow-hidden border"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("flex items-center gap-3 px-4", tall ? "h-16" : "h-14")}>
          {tall && <div className="an-skel rounded-thumb bg-s2 h-10 w-10 flex-none" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="an-skel bg-s2 h-3.5 w-2/5 rounded-full" />
            {tall && <div className="an-skel bg-s2 h-3 w-1/4 rounded-full" />}
          </div>
          <div className="an-skel bg-s2 h-3 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

const SCROLL_KEY = "clink:scroll:";

/**
 * Remember the window scroll position for a list screen and put it back on
 * return, once the cached pages have rendered (`ready`).
 */
export function useScrollRestore(key: string, ready: boolean) {
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let y = 0;
    try {
      y = Number(sessionStorage.getItem(SCROLL_KEY + key) ?? 0);
    } catch {
      y = 0;
    }
    if (y > 0) requestAnimationFrame(() => window.scrollTo({ top: y }));
  }, [key, ready]);
  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(SCROLL_KEY + key, String(Math.round(window.scrollY)));
        } catch {
          // Storage can be unavailable (private mode); restoring is a nicety.
        }
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, [key]);
}

/**
 * Call after removing something from the UI: commits the delete when the
 * toast's Undo window closes (timeout or replaced by another toast), unless
 * the person taps Undo. `restore` puts it back, `commit` does the real work and
 * throws on failure (the item then comes back with an error toast).
 */
export function deleteWithUndo({
  restore,
  commit,
  message,
  failMessage = "Couldn't remove that. It's back.",
}: {
  restore: () => void;
  commit: () => Promise<void>;
  message: string;
  failMessage?: string;
}) {
  let settled = false;
  toast(message, {
    action: {
      label: "Undo",
      onClick: () => {
        if (settled) return;
        settled = true;
        restore();
      },
    },
    onDismiss: () => {
      if (settled) return;
      settled = true;
      commit().catch(() => {
        restore();
        toast.err(failMessage);
      });
    },
  });
}
