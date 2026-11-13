import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: dark } = await supabaseAdmin()
    .from("dark_settings")
    .select("pin_hash, opted_tiers, opted_in_at")
    .eq("user_id", user!.id)
    .maybeSingle();
  return <SettingsScreen darkSetUp={Boolean(dark?.pin_hash)} myTiers={dark?.opted_tiers ?? []} />;
}
