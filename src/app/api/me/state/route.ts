import { handler, ok, requireUser, activeCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toMemoji } from "@/lib/avatars";

/** Lightweight polling target for the Link screen: am I linked yet, with whom, and both our avatars? */
export const GET = handler(async () => {
  const { user } = await requireUser();
  const couple = await activeCouple(user.id);
  if (!couple) return ok({ linked: false });
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, display_name, avatar_icon")
    .in("id", [user.id, couple.partnerId]);
  const mine = data?.find((p) => p.id === user.id);
  const theirs = data?.find((p) => p.id === couple.partnerId);
  return ok({
    linked: true,
    coupleId: couple.coupleId,
    partner: theirs?.display_name ?? "",
    myAvatar: toMemoji(mine?.avatar_icon),
    partnerAvatar: toMemoji(theirs?.avatar_icon),
  });
});
