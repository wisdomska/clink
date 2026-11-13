import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, tiersUpTo } from "@/lib/server/dark";

/**
 * DARK-04 desire match. GET returns my own answers, how many items the partner
 * has answered (a count, not answers), and mutual matches only: both yes, or
 * yes plus maybe. A "no" is never returned to anyone, and neither is a lone yes.
 */
export const GET = handler(async () => {
  const d = await requireDark({ minRank: 1 });
  const admin = supabaseAdmin();
  const tiers = tiersUpTo(d.rank);
  const { data: items } = await admin
    .from("desire_items")
    .select("id, text, tier, sort")
    .in("tier", tiers)
    .eq("enabled", true)
    .order("sort");
  const ids = (items ?? []).map((i) => i.id);
  const [{ data: mine }, { count: partnerCount }, { data: matches }] = await Promise.all([
    admin
      .from("desire_answers")
      .select("item_id, answer")
      .eq("couple_id", d.coupleId)
      .eq("user_id", d.user.id)
      .in("item_id", ids),
    admin
      .from("desire_answers")
      .select("item_id", { count: "exact", head: true })
      .eq("couple_id", d.coupleId)
      .eq("user_id", d.partnerId)
      .in("item_id", ids),
    admin.rpc("svc_desire_matches", { p_couple: d.coupleId }),
  ]);
  return ok({
    items: (items ?? []).map((i) => ({ id: i.id, text: i.text, tier: i.tier })),
    mine: Object.fromEntries((mine ?? []).map((m) => [m.item_id, m.answer])),
    partnerAnswered: partnerCount ?? 0,
    matches: (matches ?? []).filter((m) => tiers.includes(m.tier as never)),
  });
});

export const POST = handler(async (req) => {
  const d = await requireDark({ minRank: 1 });
  const { itemId, answer } = await parseJson(
    req,
    z.object({ itemId: z.uuid(), answer: z.enum(["yes", "no", "maybe"]) }),
  );
  const admin = supabaseAdmin();
  const { data: item } = await admin
    .from("desire_items")
    .select("tier")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || !tiersUpTo(d.rank).includes(item.tier as never))
    throw deny(403, "tier_locked", "That tier isn't open for you both.");
  await admin
    .from("desire_answers")
    .upsert(
      { item_id: itemId, couple_id: d.coupleId, user_id: d.user.id, answer },
      { onConflict: "item_id,couple_id,user_id" },
    );
  return ok({ ok: true });
});
