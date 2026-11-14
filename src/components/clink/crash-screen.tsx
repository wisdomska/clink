"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { WarningCircle } from "@phosphor-icons/react";

/** Shown when a screen throws. Private routes are never reported (see sentry-options). */
export function CrashScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-5">
      <WarningCircle size={44} className="text-warning" aria-hidden />
      <h1 className="display m-0 text-[36px] leading-[1.05]">
        That didn&apos;t <em>load</em>.
      </h1>
      <p className="text-muted m-0 text-base leading-normal">
        Something broke on our side. Nothing you sent is lost. Try again, or reload Clink.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="press bg-accent text-on-accent flex h-12 cursor-pointer items-center rounded-full px-6 text-base font-bold"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="press border-line bg-s2 text-text flex h-12 cursor-pointer items-center rounded-full border px-6 text-base font-medium"
        >
          Reload
        </button>
      </div>
    </main>
  );
}
