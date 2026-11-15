"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Wine } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useClinkStore } from "./clink-store";
import { feedback, flashTitle } from "@/lib/feedback";
import { useTopSlot } from "@/lib/top-slot";
import { useSendClink } from "./use-send-clink";
import { HoldTogether } from "./hold-together";

/** App-wide incoming Clink overlay (spec 9.5): slides in, soft pulse, auto-dismisses after 4 s. */
export function IncomingClink() {
  const { partner } = useCouple();
  const path = usePathname();
  const { incoming, setIncoming, setPartnerHolding } = useClinkStore();
  const { sendClink } = useSendClink();

  useCoupleEvent("clink.sent", (p) => {
    if (path.startsWith("/dark")) return;
    setIncoming({ kind: String(p.kind ?? "tap"), at: Date.now() });
    feedback("receive", "clink");
    flashTitle(`${partner.name} clinked`);
  });
  useCoupleEvent("clink.hold", (p) => setPartnerHolding(Boolean(p.holding)));

  useEffect(() => {
    if (!incoming) return;
    const t = setTimeout(() => setIncoming(null), 4000);
    return () => clearTimeout(t);
  }, [incoming, setIncoming]);

  // Arrived from a push notification.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("clink") === "1")
      setIncoming({ kind: "tap", at: Date.now() });
  }, [setIncoming]);

  useTopSlot("clink", Boolean(incoming)); // highest priority: others wait while it shows
  return (
    <>
      {incoming && (
        <>
          <div
            aria-hidden
            onClick={() => setIncoming(null)}
            className="an-fade fixed inset-0 z-30"
            style={{ background: "var(--scrim-soft)" }}
          />
          <div
            role="alertdialog"
            aria-labelledby="incoming-title"
            className="an-slide-down rounded-card border-line bg-s1 fixed top-[calc(env(safe-area-inset-top)+8px)] right-3 left-3 z-[31] mx-auto flex max-w-[420px] flex-col gap-4 border p-5 lg:left-[calc(var(--rail-w)+12px)]"
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex items-center gap-3.5">
              <Avatar
                name={partner.name}
                side="partner"
                photoUrl={partner.avatarUrl}
                icon={partner.avatarIcon}
                className="an-pulse"
              />
              <div>
                <div id="incoming-title" className="display text-[22px]">
                  {partner.name} {incoming.kind === "back" ? "clinked back" : "sent a Clink"}
                </div>
                <div className="text-muted text-sm">
                  {incoming.kind === "back"
                    ? "Streak safe for today."
                    : "Answer within 10 min to keep the streak."}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {incoming.kind !== "back" && (
                <Button
                  size="lg"
                  className="flex-1"
                  autoFocus
                  onClick={() => {
                    setIncoming(null);
                    void sendClink("back");
                  }}
                >
                  <Wine size={20} aria-hidden />
                  Clink back
                </Button>
              )}
              <Button
                size="lg"
                variant="ghost"
                className={incoming.kind === "back" ? "flex-1" : ""}
                onClick={() => setIncoming(null)}
              >
                {incoming.kind === "back" ? "Nice" : "Later"}
              </Button>
            </div>
          </div>
        </>
      )}
      <HoldTogether />
    </>
  );
}
