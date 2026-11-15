"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BellRinging, X } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { enablePush } from "@/lib/pwa";

const KEY = "clink_push_ask_until";
const COOLDOWN_MS = 7 * 24 * 3600 * 1000;

function canAsk() {
  try {
    if (!("Notification" in window) || Notification.permission !== "default") return false;
    return Number(localStorage.getItem(KEY) ?? 0) < Date.now();
  } catch {
    return false;
  }
}

/**
 * The earned ask: right after a clink from their partner lands (and its overlay
 * has gone), offer notifications, once. "Not now" waits a week. Never in After Dark.
 */
export function PushAsk() {
  const { partner } = useCouple();
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useCoupleEvent("clink.sent", () => {
    if (path.startsWith("/dark") || !canAsk()) return;
    setTimeout(() => setShow(true), 4600); // after the incoming clink overlay
  });

  if (!show || path.startsWith("/dark")) return null;

  const later = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + COOLDOWN_MS));
    } catch {
      /* ask again next time */
    }
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="push-ask-title"
      className="an-slide-down rounded-card border-line bg-s1 fixed top-[calc(env(safe-area-inset-top)+8px)] right-3 left-3 z-[31] mx-auto flex max-w-[420px] flex-col gap-3 border p-4 shadow-[var(--shadow-toast)] lg:left-[calc(var(--rail-w)+12px)]"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent text-on-accent flex h-10 w-10 flex-none items-center justify-center rounded-full">
          <BellRinging size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div id="push-ask-title" className="text-base font-bold">
            Know when {partner.name} clinks?
          </div>
          <div className="text-muted text-sm">
            Clinks arrive like texts, even when Clink is closed. Quiet hours apply.
          </div>
        </div>
        <button
          type="button"
          aria-label="Not now"
          onClick={later}
          className="press-icon text-muted -mt-1 -mr-1 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const r = await enablePush().catch(() => "denied" as const);
            setBusy(false);
            setShow(false);
            if (r === "granted") toast.ok("Notifications on.");
            else if (r === "denied") later();
          }}
        >
          Turn on
        </Button>
        <Button size="sm" variant="ghost" onClick={later}>
          Not now
        </Button>
      </div>
    </div>
  );
}
