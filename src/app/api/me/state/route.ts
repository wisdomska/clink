import { handler, ok, requireUser, activeCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Lightweight polling target for the Link screen: am I linked yet, and with whom? */
export const GET = handler(async () => {
  const { user } = await requireUser();
  const couple = await activeCouple(user.id);
  if (!couple) return ok({ linked: false });
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("display_name")
    .eq("id", couple.partnerId)
    .single();
  return ok({ linked: true, coupleId: couple.coupleId, partner: data?.display_name ?? "" });
});
