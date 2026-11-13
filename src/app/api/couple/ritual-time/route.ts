import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";

const schema = z.union([
  z.object({ suggest: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }),
  z.object({ accept: z.literal(true) }),
  z.object({ withdraw: z.literal(true) }),
]);

/**
 * HOME-08: one partner suggests a ritual time, the other agrees. Suggesting the
 * same time your partner already suggested counts as agreeing.
 */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`ritual-time:${user.id}`, 20, 3600);
  const body = await parseJson(req, schema);
  const admin = supabaseAdmin();
  const { data: c } = await admin
    .from("couples")
    .select("ritual_time, ritual_time_proposed, ritual_time_proposed_by")
    .eq("id", coupleId)
    .single();
  const pending = c?.ritual_time_proposed?.slice(0, 5) ?? null;
  const byPartner = c?.ritual_time_proposed_by === partnerId;

  const agree = async (time: string) => {
    await admin
      .from("couples")
      .update({ ritual_time: time, ritual_time_proposed: null, ritual_time_proposed_by: null })
      .eq("id", coupleId);
    await notify(partnerId, "clinks", { body: `Ritual time set to ${time}.`, url: "/us" });
    return ok({ ritualTime: time, proposed: null });
  };

  if ("accept" in body) {
    if (!pending || !byPartner)
      throw deny(409, "nothing_to_accept", "There's no suggestion to agree to.");
    return agree(pending);
  }
  if ("withdraw" in body) {
    if (c?.ritual_time_proposed_by !== user.id) return ok({ proposed: null });
    await admin
      .from("couples")
      .update({ ritual_time_proposed: null, ritual_time_proposed_by: null })
      .eq("id", coupleId);
    return ok({ proposed: null });
  }
  if (body.suggest === c?.ritual_time?.slice(0, 5))
    return ok({ ritualTime: body.suggest, proposed: null });
  if (byPartner && pending === body.suggest) return agree(body.suggest);
  await admin
    .from("couples")
    .update({ ritual_time_proposed: body.suggest, ritual_time_proposed_by: user.id })
    .eq("id", coupleId);
  await notify(partnerId, "clinks", {
    body: `New ritual time suggested: ${body.suggest}. Agree in Settings.`,
    url: "/settings",
  });
  return ok({ proposed: { time: body.suggest, byMe: true } });
});
