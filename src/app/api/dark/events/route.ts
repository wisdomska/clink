import { z } from "zod";
import { handler, ok, parseJson, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";

/** SAF-07: log tab switch or app blur while sensitive media was on screen. Security log only. */
export const POST = handler(async (req) => {
  const d = await requireDark({ refresh: false });
  await rateLimit(`dark-ev:${d.user.id}`, 120, 3600);
  const { mediaId, event } = await parseJson(
    req,
    z.object({ mediaId: z.uuid(), event: z.enum(["blur", "hidden"]) }),
  );
  const { data: m } = await supabaseAdmin()
    .from("media")
    .select("couple_id")
    .eq("id", mediaId)
    .maybeSingle();
  if (m?.couple_id === d.coupleId)
    await supabaseAdmin()
      .from("sensitive_view_events")
      .insert({ media_id: mediaId, couple_id: d.coupleId, viewer_id: d.user.id, event });
  return ok({ ok: true });
});
