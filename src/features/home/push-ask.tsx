"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRinging, X } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { enablePush } from "@/lib/pwa";
import { useTopSlot } from "@/lib/top-slot";
import { supabaseBrowser } from "@/lib/supabase/client";

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
 * The earned ask, at one of two moments: right after a clink from their
 * partner lands (and its overlay has gone), or on opening Clink to clinks they
 * missed while it was closed (the moment notifications would have helped).
 * Once; "Not now" waits a week. Never in After Dark.
 */
export function PushAsk() {
  const { partner } = useCouple();
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [missed, setMissed] = useState(0);
  const [busy, setBusy] = useState(false);
  const checked = useRef(false);

  useCoupleEvent("clink.sent", () => {
    if (path.startsWith("/dark") || !canAsk()) return;
    setTimeout(() => setShow(true), 4600); // after the incoming clink overlay
  });

  // Clinks from them in the last two days that you haven't answered, sent
  // before you opened Clink: they arrived while it was closed.
  useEffect(() => {
    if (checked.current || path.startsWith("/dark") || !partner.id || !canAsk()) return;
    checked.current = true;
    const opened = new Date().toISOString();
    let t: ReturnType<typeof setTimeout> | undefined;
    void supabaseBrowser()
      .from("clinks")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", partner.id)
      .is("answered_at", null)
      .gt("created_at", new Date(Date.now() - 48 * 3600_000).toISOString())
      .lt("created_at", opened)
      .then(({ count }) => {
        if (!count || !canAsk()) return;
        setMissed(count);
        t = setTimeout(() => setShow(true), 2500); // after anything waiting to greet you
      });
    return () => clearTimeout(t);
  }, [path, partner.id]);

  const mine = useTopSlot("push", show && !path.startsWith("/dark"));
  if (!mine) return null;

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
            {missed
              ? `${missed} ${missed === 1 ? "clink" : "clinks"} from ${partner.name} while you were away`
              : `Know when ${partner.name} clinks?`}
          </div>
          <div className="text-muted text-sm">
            {missed
              ? "Turn on notifications and they'll reach you even when Clink is closed. Quiet hours apply."
              : "Clinks arrive like texts, even when Clink is closed. Quiet hours apply."}
          </div>
        </div>
        <button
          type="button"
          aria-label="Not now"
          onClick={later}
          className="press-icon text-muted -mt-1.5 -mr-1.5 flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full"
        >
          <X size={20} aria-hidden />
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
