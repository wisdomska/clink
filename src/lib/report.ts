"use client";
import { sentryOptions } from "@/lib/sentry-options";

/**
 * Error reporting, loaded after the app has started rather than with it:
 * the reporter is the heaviest shared piece of JavaScript, and nothing on
 * screen needs it. Errors from the first moments are kept and sent once it
 * loads. Never inside After Dark or admin.
 */
type Sentry = typeof import("@sentry/nextjs");
let sentry: Sentry | null = null;
let loading = false;
const early: unknown[] = [];
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const allowed = () => Boolean(dsn) && !/^\/(dark|admin)(\/|$)/.test(window.location.pathname);

export function reportError(error: unknown) {
  if (!allowed()) return;
  if (sentry) sentry.captureException(error);
  else if (early.length < 20) early.push(error);
}

export function startReporting() {
  if (loading || !allowed()) return;
  loading = true;
  const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
  const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  const load = () =>
    void import("@sentry/nextjs").then((S) => {
      S.init({ ...sentryOptions(dsn), integrations: [] });
      sentry = S;
      // Sentry listens for uncaught errors itself from here on.
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      early.splice(0).forEach((e) => S.captureException(e));
    });
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
  };
  if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 5000 });
  else setTimeout(load, 3000);
}
