"use client";
import { sentryOptions } from "@/lib/sentry-options";

/**
 * Error reporting from the browser. Errors go to Clink's own error log
 * (/api/errors, read in admin), and to Sentry too if a key is ever set, which
 * loads after the app has started rather than with it. Never inside After
 * Dark or admin, and never more than a handful per visit.
 */
type Sentry = typeof import("@sentry/nextjs");
let sentry: Sentry | null = null;
let started = false;
let sent = 0;
const seen = new Set<string>();
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const privatePage = () => /^\/(dark|admin)(\/|$)/.test(window.location.pathname);

function toLog(error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error ?? "Unknown error"));
  // Cancelled screen-change animations and interrupted plays aren't failures
  // (the server keeps the full list; this saves the request).
  if (/^(Transition was (aborted|skipped)|ResizeObserver loop)/i.test(e.message)) return;
  const key = `${e.message}|${(e.stack ?? "").split("\n")[1] ?? ""}`;
  if (seen.has(key) || sent >= 10) return;
  seen.add(key);
  sent++;
  const body = JSON.stringify({
    message: e.message.slice(0, 2000),
    stack: (e.stack ?? "").slice(0, 8000),
    path: window.location.pathname,
  });
  try {
    if (
      navigator.sendBeacon?.(
        new URL("/api/errors", window.location.href),
        new Blob([body], { type: "application/json" }),
      )
    )
      return;
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function reportError(error: unknown) {
  if (typeof window === "undefined" || privatePage()) return;
  toLog(error);
  sentry?.captureException(error);
}

export function startReporting() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("error", (e) => reportError(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason));
  watchFirstLoad();
  if (!dsn) return;
  const load = () => {
    if (privatePage()) return;
    void import("@sentry/nextjs").then((S) => {
      S.init({ ...sentryOptions(dsn), integrations: [] });
      sentry = S;
    });
  };
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
  };
  if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 5000 });
  else setTimeout(load, 3000);
}

type LcpEntry = PerformanceEntry & { url?: string; element?: Element | null };

/**
 * Where a first load's time went (Google's four-part breakdown): server until
 * the first byte, wait until the main picture starts downloading, fetch while
 * it downloads, render after. Plus plain facts: the main element's tag, the
 * network type, installed app or browser, and whether the page itself came
 * from the device's cache. Nothing about who.
 */
export function splitLcp(lcp: number, entry: LcpEntry | null) {
  const nav = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  const server = Math.max(0, Math.round(nav?.responseStart ?? 0));
  let wait = 0;
  let fetchMs = 0;
  if (entry?.url) {
    const res = performance.getEntriesByName(entry.url, "resource")[0] as
      PerformanceResourceTiming | undefined;
    if (res) {
      const start = res.requestStart || res.startTime;
      wait = Math.max(0, Math.round(start - server));
      fetchMs = Math.max(0, Math.round(res.responseEnd - start));
    }
  }
  const render = Math.max(0, lcp - server - wait - fetchMs);
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return {
    server,
    wait,
    fetch: fetchMs,
    render,
    element: entry?.element?.tagName.toLowerCase().slice(0, 20) ?? (entry?.url ? "img" : "text"),
    net: conn?.effectiveType?.slice(0, 10),
    installed: window.matchMedia?.("(display-mode: standalone)").matches ?? false,
    warm: nav ? nav.transferSize === 0 : false,
  };
}

/**
 * How long this screen took to show its main content (Largest Contentful
 * Paint), sent once when you leave or hide it. Path and milliseconds only, for
 * the weekly health summary. Never for After Dark or admin.
 */
function watchFirstLoad() {
  if (privatePage() || typeof PerformanceObserver === "undefined") return;
  const path = window.location.pathname;
  // Only loads the person actually watched count (Google's rule for this
  // measure): a page opened in the background reports its load from when it
  // was opened, not when it was seen, which made a 2 s screen look like 120 s.
  let hiddenAt = document.visibilityState === "hidden" ? 0 : Infinity;
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") hiddenAt = Math.min(hiddenAt, performance.now());
    },
    { once: true },
  );
  let lcp = 0;
  let last = null as LcpEntry | null;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        if (e.startTime < hiddenAt) {
          lcp = Math.round(e.startTime);
          last = e as LcpEntry;
        }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    return;
  }
  let sent = false;
  const send = () => {
    if (sent || !lcp || lcp > 60_000) return;
    sent = true;
    let detail: ReturnType<typeof splitLcp> | undefined;
    try {
      detail = splitLcp(lcp, last);
    } catch {
      /* the total alone still helps */
    }
    const body = JSON.stringify({ path, lcp, detail });
    try {
      if (navigator.sendBeacon?.("/api/vitals", new Blob([body], { type: "application/json" })))
        return;
    } catch {
      /* fall through */
    }
    void fetch("/api/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });
  window.addEventListener("pagehide", send);
}
