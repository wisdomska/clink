import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";

/** Push "X is calling" so a partner with Clink closed can still pick up. */
export const POST = handler(async (req) => {
  const { user, partnerId } = await requireCouple();
  await rateLimit(`call-ring:${user.id}`, 30, 3600);
  const { video } = await parseJson(req, z.object({ video: z.boolean() }));
  const { data: me } = await supabaseAdmin()
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  await notify(partnerId, "chat", {
    body: `${me?.display_name ?? "Your person"} is ${video ? "video " : ""}calling you`,
    url: "/chat",
    tag: "call",
  });
  return ok({ ok: true });
});
