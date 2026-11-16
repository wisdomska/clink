"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { WifiSlash, Megaphone, X } from "@phosphor-icons/react";
import { TabBar, Rail } from "@/components/clink/nav";
import { IncomingClink } from "@/features/home/incoming-clink";
import { cn } from "@/components/ui/cn";
import { useOnline, useStoredString } from "@/lib/hooks";
import { GameInviteToast } from "@/features/play/invite-toast";
import { PushAsk } from "@/features/home/push-ask";
import { SearchShortcut } from "@/features/search/search-shortcut";
import { useCouple } from "@/features/couple/context";
import { MessageTone } from "@/features/chat/message-tone";
import { SoloHome, SoloGate, SOLO_OPEN } from "@/features/couple/solo";

const HIDE_TABS = [/^\/play\/[^/]+\/[^/]+/, /^\/help/, /^\/plans\/watch\//];

export function AppShell({
  children,
  banners,
}: {
  children: React.ReactNode;
  banners: Array<{ id: string; kind: string; body: string }>;
}) {
  const path = usePathname();
  const { solo } = useCouple();
  const tabs = !HIDE_TABS.some((r) => r.test(path));
  // Not linked yet: Us becomes the invite home, partner-only screens ask you to link.
  const body = !solo ? (
    children
  ) : path === "/us" ? (
    <SoloHome />
  ) : SOLO_OPEN.some((r) => r.test(path)) ? (
    children
  ) : (
    <SoloGate path={path} />
  );
  const online = useOnline();
  const [dismissedRaw, setDismissedRaw] = useStoredString("clink_banners", "[]");
  let dismissed: string[] = [];
  try {
    dismissed = JSON.parse(dismissedRaw) as string[];
  } catch {
    dismissed = [];
  }

  const visible = banners.filter((b) => b.kind === "maintenance" || !dismissed.includes(b.id));
  const hasBanner = !online || visible.length > 0;
  // Tell the page how tall the pinned banners are, so top bars stick right under them.
  const mainRef = useRef<HTMLDivElement>(null);
  const bannersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = mainRef.current;
    const el = bannersRef.current;
    if (!main) return;
    if (!el) {
      main.style.removeProperty("--banner-h");
      return;
    }
    const set = () => main.style.setProperty("--banner-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasBanner]);

  return (
    <>
      <Rail />
      {!solo && <SearchShortcut />}
      {!solo && <GameInviteToast />}
      <div ref={mainRef} className={cn("app-main", !tabs && "no-tabs", hasBanner && "has-banner")}>
        {/* Banners stay pinned at the top; each screen's top bar sits just below them. */}
        {hasBanner && (
          <div ref={bannersRef} className="bg-app sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
            {!online && (
              <div
                role="status"
                className="an-banner bg-s2 border-accent text-text flex items-center gap-2.5 border-b-2 px-4 py-2.5 text-sm font-bold"
              >
                <WifiSlash size={18} weight="bold" className="text-warning" aria-hidden />
                You&apos;re offline. Messages send when you&apos;re back.
              </div>
            )}
            {visible.map((b) => (
              <div
                key={b.id}
                role="status"
                className={cn(
                  "an-banner flex items-center gap-3 px-4 py-2.5 text-sm font-bold shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]",
                  // News wears your accent colour; maintenance is a calm surface with a warning icon.
                  b.kind === "maintenance"
                    ? "bg-s2 border-accent text-text border-b-2"
                    : "bg-accent text-on-accent",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 flex-none items-center justify-center rounded-full",
                    b.kind === "maintenance" ? "bg-s3 text-warning" : "bg-on-accent text-accent",
                  )}
                >
                  <Megaphone size={16} weight="fill" aria-hidden />
                </span>
                <span className="flex-1 leading-snug">{b.body}</span>
                {b.kind !== "maintenance" && (
                  <button
                    type="button"
                    aria-label="Dismiss"
                    className="press-icon flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-current"
                    onClick={() => setDismissedRaw(JSON.stringify([...dismissed, b.id]))}
                  >
                    <X size={18} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {body}
      </div>
      {tabs && <TabBar />}
      {!solo && <IncomingClink />}
      {!solo && <MessageTone />}
      {!solo && <PushAsk />}
    </>
  );
}
