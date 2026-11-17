import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyCall } from "@/lib/server/push";

/**
 * Ring your partner's devices even when Clink is closed (high-urgency push
 * with Answer / Decline). With cancel: true (you hung up, or nobody answered)
 * the ringing notification becomes a quiet missed call.
 */
export const POST = handler(async (req) => {
  const { user, partnerId } = await requireCouple();
  await rateLimit(`call-ring:${user.id}`, 60, 3600);
  const body = await parseJson(
    req,
    z.object({ id: z.uuid(), video: z.boolean(), cancel: z.boolean().optional() }),
  );
  const { data: me } = await supabaseAdmin()
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const r = await notifyCall(partnerId, {
    id: body.id,
    video: body.video,
    from: me?.display_name ?? "Your partner",
    cancel: body.cancel,
  });
  return ok({ sent: r.sent });
});
