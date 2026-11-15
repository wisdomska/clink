import { headers } from "next/headers";
import { loadCoupleContext } from "@/lib/server/couple-context";
import { CoupleProvider } from "@/features/couple/context";
import { CallProvider } from "@/features/call/call-provider";
import { PartnerSheetProvider } from "@/features/partner/partner-sheet";
import { AppShell } from "@/features/couple/app-shell";
import { AppRelock } from "@/features/couple/app-relock";
import { QueryProvider } from "@/features/couple/query-provider";
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
    <QueryProvider>
      <CoupleProvider value={ctx}>
        {ctx.appLock && <AppRelock />}
        <CallProvider>
          <PartnerSheetProvider>
            <AppShell banners={banners ?? []}>{children}</AppShell>
          </PartnerSheetProvider>
        </CallProvider>
      </CoupleProvider>
    </QueryProvider>
  );
}
