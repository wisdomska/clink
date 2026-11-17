import { Suspense } from "react";
import type { Metadata } from "next";
import { DarkSkeleton } from "@/features/dark/dark-skeleton";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadCoupleContext } from "@/lib/server/couple-context";
import { CoupleProvider } from "@/features/couple/context";
import { QueryProvider } from "@/features/couple/query-provider";
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
  if (!setUp && pathname !== "/dark/setup") redirect("/dark/setup");
  const unlocked = setUp && (await hasDarkSession(ctx.me.id));
  const open = ["/dark", "/dark/setup"];
  if (setUp && !unlocked && !open.includes(pathname))
    redirect(`/dark?next=${encodeURIComponent(path)}`);
  // Already unlocked: skip the lock screen (and its round trip) and go straight in.
  if (unlocked && pathname === "/dark") {
    const next = new URLSearchParams(path.split("?")[1] ?? "").get("next");
    redirect(next?.startsWith("/dark/") ? next : "/dark/home");
  }
  return (
    <QueryProvider>
      <CoupleProvider value={ctx}>
        <div data-mode="dark" className="bg-app min-h-dvh">
          {unlocked && <DarkIdle />}
          {children}
        </div>
      </CoupleProvider>
    </QueryProvider>
  );
}
