"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { WarningCircle, WifiSlash } from "@phosphor-icons/react";
import { useOnline } from "@/lib/hooks";

/** Shown when a screen throws. Private routes are never reported (see sentry-options). */
export function CrashScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const online = useOnline();
  useEffect(() => {
    if (online) Sentry.captureException(error);
  }, [error, online]);
  if (!online)
    return (
      <main className="an-screen mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-5">
        <WifiSlash size={44} className="text-warning" aria-hidden />
        <h1 className="display m-0 text-[36px] leading-[1.05]">
          You&apos;re <em>offline</em>.
        </h1>
        <p className="text-muted m-0 text-base leading-normal">
          This screen needs a connection. It comes back by itself when you&apos;re online.
        </p>
        <button
          type="button"
          onClick={reset}
          className="press bg-accent text-on-accent flex h-12 w-fit cursor-pointer items-center rounded-full px-6 text-base font-bold"
        >
          Try again
        </button>
      </main>
    );
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
