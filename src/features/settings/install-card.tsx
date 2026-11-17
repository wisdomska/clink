"use client";
import Link from "next/link";
import { CheckCircle, DeviceMobile, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useInstallState, promptInstall } from "@/lib/install";

/**
 * Settings: put Clink on the home screen. One tap where the browser allows it
 * (Chrome, Edge, Android); step-by-step guide where it doesn't (iPhone Safari).
 */
export function InstallCard() {
  const state = useInstallState();
  return (
    <section
      aria-labelledby="install-h"
      className="rounded-card border-line bg-s1 flex items-center gap-4 border p-4"
    >
      <span className="bg-s2 text-accent rounded-ticket flex h-12 w-12 flex-none items-center justify-center">
        {state === "installed" ? (
          <CheckCircle size={26} weight="fill" aria-hidden />
        ) : (
          <DeviceMobile size={26} weight="fill" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="install-h" className="m-0 text-base font-bold">
          {state === "installed" ? "Clink is on your home screen" : "Add Clink to your home screen"}
        </h2>
        <p className="text-muted m-0 text-sm">
          {state === "installed"
            ? "It opens like an app, and notifications arrive like texts."
            : "Opens like an app, full screen, with notifications like texts."}
        </p>
      </div>
      {state === "prompt" && (
        <Button
          size="sm"
          onClick={async () => {
            if (await promptInstall()) toast.ok("Added. Find Clink on your home screen.");
          }}
        >
          Add
        </Button>
      )}
      {state === "manual" && (
        <Link
          href="/install"
          className="press text-accent hover:text-accent flex h-11 flex-none items-center gap-1 rounded-full px-3 text-sm font-semibold"
        >
          How to
          <CaretRight size={16} weight="bold" aria-hidden />
        </Link>
      )}
    </section>
  );
}
