import { Suspense } from "react";
import type { Metadata } from "next";
import { DarkSkeleton } from "@/features/dark/dark-skeleton";
import { headers } from "next/headers";
import { DarkGo } from "@/features/dark/go";
import { OfflineBar } from "@/components/clink/offline-saves";
import { DarkGuard } from "@/features/dark/guard";
import { RouteFocus } from "@/components/clink/route-focus";
import { loadCoupleContext } from "@/lib/server/couple-context";
import { hasDarkSession } from "@/lib/server/dark";
import { sessionUser } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DarkIdle } from "@/features/dark/idle";

export const metadata: Metadata = { title: "Private", robots: { index: false, follow: false } };

/**
 * After Dark shell: Ember accent everywhere, no tab bar, no third-party scripts
 * (CSP), never cached (headers), locked after 2 minutes idle.
 */
export default function DarkLayout({ children }: { children: React.ReactNode }) {
  // The checks below hit the database; stream a skeleton first so opening After
  // Dark is instant instead of a blank wait.
  return (
    <Suspense fallback={<DarkSkeleton />}>
      <DarkShell>{children}</DarkShell>
    </Suspense>
  );
}

async function DarkShell({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/dark";
  const pathname = path.split("?")[0]!;
  // The couple and your After Dark setup load together, not one after the other.
  const user = await sessionUser();
  const [ctx, { data: mine }] = await Promise.all([
    loadCoupleContext(path),
    user
      ? supabaseAdmin()
          .from("dark_settings")
          .select("pin_hash")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const setUp = Boolean(mine?.pin_hash);
  const go = (href: string) => (
    <>
      <DarkSkeleton />
      <DarkGo href={href} />
    </>
  );
  if (!setUp && pathname !== "/dark/setup") return go("/dark/setup");
  const unlocked = setUp && (await hasDarkSession(ctx.me.id));
  const open = ["/dark", "/dark/setup"];
  if (setUp && !unlocked && !open.includes(pathname))
    return go(`/dark?next=${encodeURIComponent(path)}`);
  // Already unlocked: skip the lock screen (and its round trip) and go straight in.
  if (unlocked && pathname === "/dark") {
    const next = new URLSearchParams(path.split("?")[1] ?? "").get("next");
    return go(next?.startsWith("/dark/") ? next : "/dark/home");
  }
  return (
    <div data-mode="dark" className="bg-app min-h-dvh">
      <DarkGuard />
      <RouteFocus />
      <OfflineBar />
      {unlocked && <DarkIdle />}
      {children}
    </div>
  );
}
