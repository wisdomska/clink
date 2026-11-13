import { z } from "zod";
import { handler, ok, parseJson, requireUser, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** POST /api/push/subscribe: one subscription per device (endpoint is unique). */
export const POST = handler(async (req) => {
  const { user } = await requireUser();
  await rateLimit(`push:${user.id}`, 20, 3600);
  const body = await parseJson(req, schema);
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
  return ok({ ok: true }, { status: 201 });
});

export const DELETE = handler(async (req) => {
  const { user } = await requireUser();
  const { endpoint } = await parseJson(req, z.object({ endpoint: z.url() }));
  await supabaseAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  return ok({ ok: true });
});
