"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { messagesQuery } from "@/features/chat/messages-query";

/**
 * Once Us has settled, quietly fetch the newest chat messages so the first tap
 * on Chat opens straight onto them. Skipped before linking, on a data saver or
 * a slow (2G) connection, and while the screen is in the background. The chat
 * still refreshes itself the moment it opens.
 */
export function useWarmChat(coupleId: string | null | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!coupleId) return;
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? "")) return;
    const q = messagesQuery(coupleId);
    let cancelled = false;
    const go = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (qc.getQueryData(q.queryKey)) return;
      void qc.prefetchInfiniteQuery(q).catch(() => undefined);
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    // After the screen's own work: a beat, then the browser's next idle moment.
    let idle: number | undefined;
    const t = setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(go, { timeout: 4000 });
      else go();
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
    };
  }, [coupleId, qc]);
}
