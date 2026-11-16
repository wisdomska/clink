import { handler, ok, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";

/**
 * HOME-03: you're holding the Clink and your partner isn't. A push asks them
 * to come hold it too. At most one every 2 minutes, so it never nags.
 */
export const POST = handler(async () => {
  const { user, partnerId } = await requireCouple();
  await rateLimit(`hold-call:${user.id}`, 20, 3600);
  const { data: me } = await supabaseAdmin()
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const r = await notify(
    partnerId,
    "clinks",
    {
      body: `${me?.display_name ?? "Your partner"} is holding the Clink. Come hold it too.`,
      url: "/us?hold=1",
      tag: "hold",
    },
    `hold-call:${user.id}:${Math.floor(Date.now() / 120_000)}`,
  );
  return ok({ sent: r.sent });
});
