import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init(sentryOptions(dsn));
}

export const onRequestError = Sentry.captureRequestError;
