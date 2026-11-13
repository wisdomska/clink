"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WifiSlash, Megaphone, X } from "@phosphor-icons/react";
import { TabBar, Rail } from "@/components/clink/nav";
import { IncomingClink } from "@/features/home/incoming-clink";
import { cn } from "@/components/ui/cn";

const HIDE_TABS = [/^\/play\/[^/]+\/[^/]+/, /^\/settings/, /^\/help/, /^\/plans\/watch\//];

export function AppShell({ children, banners }: { children: React.ReactNode; banners: Array<{ id: string; kind: string; body: string }> }) {
  const path = usePathname();
  const tabs = !HIDE_TABS.some((r) => r.test(path));
  const [online, setOnline] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setOnline(navigator.onLine);
    try {
      setDismissed(JSON.parse(localStorage.getItem("clink_banners") ?? "[]"));
    } catch {
      /* storage blocked */
    }
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const visible = banners.filter((b) => b.kind === "maintenance" || !dismissed.includes(b.id));

  return (
    <>
      <Rail />
      <div className={cn("app-main", !tabs && "no-tabs")}>
        {!online && (
          <div role="status" className="sticky top-0 z-30 flex items-center gap-2 bg-s3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)] text-sm font-medium">
            <WifiSlash size={18} className="text-warning" aria-hidden />
            You&apos;re offline. Messages send when you&apos;re back.
          </div>
        )}
        {visible.map((b) => (
          <div key={b.id} role="status" className="flex items-center gap-2 border-b border-line bg-s1 px-4 py-2.5 text-sm font-medium">
            <Megaphone size={18} className={b.kind === "maintenance" ? "text-warning" : "text-accent"} aria-hidden />
            <span className="flex-1">{b.body}</span>
            {b.kind !== "maintenance" && (
              <button
                type="button"
                aria-label="Dismiss"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent text-muted"
                onClick={() => {
                  const next = [...dismissed, b.id];
                  setDismissed(next);
                  try {
                    localStorage.setItem("clink_banners", JSON.stringify(next));
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        {children}
      </div>
      {tabs && <TabBar />}
      <IncomingClink />
    </>
  );
}
