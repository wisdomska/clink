"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { WarningCircle, WifiSlash } from "@phosphor-icons/react";
import { useOnline } from "@/lib/hooks";
import { inCall } from "@/lib/call-flag";
import { cn } from "@/components/ui/cn";

/**
 * Shown when a screen throws. Private routes are never reported (see
 * sentry-options). `inline` keeps it inside the app, so the tab bar and a
 * call in progress stay put. Reload is hidden during a call: it would hang up.
 */
export function CrashScreen({
  error,
  reset,
  inline = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  inline?: boolean;
}) {
  const online = useOnline();
  useEffect(() => {
    if (online) Sentry.captureException(error);
  }, [error, online]);
  const Tag = inline ? "section" : "main";
  const box = cn(
    "an-screen mx-auto flex w-full max-w-[480px] flex-col justify-center gap-4 px-5",
    inline ? "min-h-[60dvh] py-10" : "min-h-dvh",
  );
  const Heading = inline ? "h2" : "h1";
  if (!online)
    return (
      <Tag className={box} role="alert">
        <WifiSlash size={44} className="text-warning" aria-hidden />
        <Heading className="display m-0 text-[36px] leading-[1.05]">You&apos;re offline.</Heading>
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
      </Tag>
    );
  return (
    <Tag className={box} role="alert">
      <WarningCircle size={44} className="text-warning" aria-hidden />
      <Heading className="display m-0 text-[36px] leading-[1.05]">That didn&apos;t load.</Heading>
      <p className="text-muted m-0 text-base leading-normal">
        Something broke on our side. Nothing you sent is lost.{" "}
        {inline ? "The rest of Clink still works." : "Try again, or reload Clink."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="press bg-accent text-on-accent flex h-12 cursor-pointer items-center rounded-full px-6 text-base font-bold"
        >
          Try again
        </button>
        {!inCall() && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="press border-line bg-s2 text-text flex h-12 cursor-pointer items-center rounded-full border px-6 text-base font-medium"
          >
            Reload
          </button>
        )}
      </div>
    </Tag>
  );
}
