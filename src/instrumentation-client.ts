import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
// Never initialise inside After Dark or admin: nothing from those screens is reported.
if (dsn && !/^\/(dark|admin)(\/|$)/.test(window.location.pathname)) {
  Sentry.init({ ...sentryOptions(dsn), integrations: [] });
}
