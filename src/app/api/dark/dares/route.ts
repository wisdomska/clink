import { z } from "zod";
import { handler, ok, parseJson, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, tiersUpTo, TIERS } from "@/lib/server/dark";

/** Custom dares for any tier you've both unlocked. */
export const POST = handler(async (req) => {
  const d = await requireDark({ minRank: 1 });
  await rateLimit(`dare-new:${d.user.id}`, 30, 3600);
  const { tier, text } = await parseJson(
    req,
    z.object({ tier: z.enum(TIERS), text: z.string().trim().min(3).max(280) }),
  );
  if (!tiersUpTo(d.rank).includes(tier))
    throw deny(403, "tier_locked", "That tier isn't open for you both.");
  const { data } = await supabaseAdmin()
    .from("dares")
    .insert({
      tier,
      text,
      is_custom: true,
      couple_id: d.coupleId,
      created_by: d.user.id,
      needs_media: false,
    })
    .select("id")
    .single();
  return ok({ id: data!.id }, { status: 201 });
});
