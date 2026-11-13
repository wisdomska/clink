import type { ErrorEvent } from "@sentry/nextjs";

/** Routes whose errors must never leave the server or device. */
const PRIVATE = /^\/(dark|api\/dark|api\/media|admin|api\/admin)(\/|$)/;

function pathOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url, "http://x").pathname;
  } catch {
    return "";
  }
}

/**
 * Errors only: no tracing, no replay, no default PII. Request bodies, cookies,
 * headers, query strings and breadcrumbs are dropped so no couple content can
 * reach Sentry. After Dark, media and admin errors are not sent at all.
 */
export function scrub(event: ErrorEvent): ErrorEvent | null {
  const path = pathOf(event.request?.url) || pathOf(event.transaction);
  if (PRIVATE.test(path) || (event.transaction && PRIVATE.test(event.transaction))) return null;
  if (event.request) {
    event.request = { method: event.request.method, url: path || undefined };
  }
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  return event;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: scrub,
  };
}
