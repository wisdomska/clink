import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await sessionUser();
  // Session ran out between the layout and here: sign in again, don't crash.
  if (!user) redirect("/auth/reset?next=/settings");
  const { data: dark } = await supabaseAdmin()
    .from("dark_settings")
    .select("pin_hash, opted_tiers, opted_in_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return <SettingsScreen darkSetUp={Boolean(dark?.pin_hash)} myTiers={dark?.opted_tiers ?? []} />;
}
