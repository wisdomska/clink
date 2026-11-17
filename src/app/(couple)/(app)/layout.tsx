import { PartnerSheetProvider } from "@/features/partner/partner-sheet";
import { AppShell } from "@/features/couple/app-shell";
import { AppRelock } from "@/features/couple/app-relock";
import { loadCoupleContext } from "@/lib/server/couple-context";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/us";
  const ctx = await loadCoupleContext(path);
  const { data: banners } = await supabaseAdmin()
    .from("announcements")
    .select("id, kind, body")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(2);
  return (
    <>
      {ctx.appLock && <AppRelock />}
      <PartnerSheetProvider>
        <AppShell banners={banners ?? []}>{children}</AppShell>
      </PartnerSheetProvider>
    </>
  );
}
