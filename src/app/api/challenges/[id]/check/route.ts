import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { localParts } from "@/lib/time";
import { dayNumber, badges, bothDone } from "@/lib/challenges";
import { track } from "@/lib/server/analytics";

/** Daily check-off by each partner. Today only; badges and completion are computed here. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId, role } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("challenges").select("id, couple_id, start_on, status, challenge_templates(days)").eq("id", id).maybeSingle();
  if (!c || c.couple_id !== coupleId) throw deny(404, "not_found", "Not found.");
  if (c.status !== "active") throw deny(409, "over", "That challenge is finished.");
  const length = (c.challenge_templates as unknown as { days: number }).days;
  const { data: me } = await admin.from("profiles").select("timezone").eq("id", user.id).single();
  const today = dayNumber(c.start_on, localParts(new Date(), me?.timezone ?? "UTC").dateKey);
  if (today < 1 || today > length) throw deny(409, "out_of_range", "Today isn't part of this challenge.");
  const stamp = new Date().toISOString();
  await admin.from("challenge_days").update(role === "a" ? { done_by_a: stamp } : { done_by_b: stamp }).eq("challenge_id", id).eq("day", today);
  const { data: days } = await admin.from("challenge_days").select("day, done_by_a, done_by_b").eq("challenge_id", id);
  const earned = badges(days ?? [], today, length);
  if (earned.length) await admin.from("couple_badges").upsert(earned.map((badge) => ({ couple_id: coupleId, badge })), { onConflict: "couple_id,badge", ignoreDuplicates: true });
  const todayRow = days?.find((d) => d.day === today);
  if (bothDone(todayRow)) await track("activity_completed", user.id, { type: "challenge_day", mode: "turn" }, coupleId);
  if ((days ?? []).filter(bothDone).length === length) {
    await admin.from("challenges").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
  }
  return ok({ today, badges: earned });
});
