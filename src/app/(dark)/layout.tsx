import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadCoupleContext } from "@/lib/server/couple-context";
import { CoupleProvider } from "@/features/couple/context";
import { QueryProvider } from "@/features/couple/query-provider";
import { hasDarkSession } from "@/lib/server/dark";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DarkIdle } from "@/features/dark/idle";

export const metadata: Metadata = { title: "Private", robots: { index: false, follow: false } };

/**
 * After Dark shell: Ember accent everywhere, no tab bar, no third-party scripts
 * (CSP), never cached (headers), locked after 2 minutes idle.
 */
export default async function DarkLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/dark";
  const ctx = await loadCoupleContext(path);
  const pathname = path.split("?")[0]!;
  const { data: mine } = await supabaseAdmin()
    .from("dark_settings")
    .select("pin_hash")
    .eq("user_id", ctx.me.id)
    .maybeSingle();
  const setUp = Boolean(mine?.pin_hash);
  if (!setUp && pathname !== "/dark/setup") redirect("/dark/setup");
  const unlocked = setUp && (await hasDarkSession(ctx.me.id));
  const open = ["/dark", "/dark/setup"];
  if (setUp && !unlocked && !open.includes(pathname))
    redirect(`/dark?next=${encodeURIComponent(path)}`);
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
