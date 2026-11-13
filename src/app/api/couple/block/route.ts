import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { endCouple } from "@/lib/server/wipe";

/** SAF-08: block from inside After Dark. Blocking unlinks and triggers the wipe. */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`block:${user.id}`, 5, 3600);
  const { report } = await parseJson(req, z.object({ report: z.string().max(4000).optional() }));
  await supabaseAdmin().from("user_blocks").upsert({ blocker_id: user.id, blocked_id: partnerId });
  if (report) {
    await supabaseAdmin().from("reports").insert({
      reporter_id: user.id,
      couple_id: coupleId,
      reported_user_id: partnerId,
      category: "harassment",
      details: report,
      from_after_dark: true,
    });
  }
  await endCouple(coupleId, "block", user.id);
  return ok({ ok: true });
});
