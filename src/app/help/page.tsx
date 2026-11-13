import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeCouple } from "@/lib/server/api";
import { HelpScreen } from "@/features/help/help-screen";

export const metadata: Metadata = { title: "Help and safety" };

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; from?: string }>;
}) {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  let partner: string | null = null;
  if (user) {
    const c = await activeCouple(user.id);
    if (c)
      partner =
        (
          await supabaseAdmin()
            .from("profiles")
            .select("display_name")
            .eq("id", c.partnerId)
            .single()
        ).data?.display_name ?? null;
  }
  const sp = await searchParams;
  return (
    <HelpScreen
      signedIn={Boolean(user)}
      partner={partner}
      startReport={Boolean(sp.report)}
      fromDark={sp.from === "dark"}
    />
  );
}
