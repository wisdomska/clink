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

/**
 * How long this screen took to show its main content (Largest Contentful
 * Paint), sent once when you leave or hide it. Path and milliseconds only, for
 * the weekly health summary. Never for After Dark or admin.
 */
function watchFirstLoad() {
  if (privatePage() || typeof PerformanceObserver === "undefined") return;
  const path = window.location.pathname;
  let lcp = 0;
  try {
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) lcp = Math.round(last.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    return;
  }
  let sent = false;
  const send = () => {
    if (sent || !lcp) return;
    sent = true;
    const body = JSON.stringify({ path, lcp: Math.min(lcp, 120_000) });
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
