import type { Instrumentation } from "next";

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  const { sentryOptions } = await import("@/lib/sentry-options");
  Sentry.init(sentryOptions(dsn));
}

/** A page or route failed to render on the server: keep it in the error log. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/server/error-log");
  const e = err as Error & { digest?: string };
  await logError({
    source: "server",
    message: `${e.message ?? String(err)}${context.routeType ? ` (${context.routeType})` : ""}`,
    stack: e.stack,
    path: request.path,
    userAgent: (request.headers["user-agent"] as string | undefined) ?? null,
  });
  if (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(err, request, context);
  }
};
