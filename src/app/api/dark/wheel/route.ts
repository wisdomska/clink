import { handler, ok, deny, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, tiersUpTo } from "@/lib/server/dark";

/** DARK-05 spin: a random dare from the tiers you've both unlocked (library plus your custom dares). */
export const POST = handler(async () => {
  const d = await requireDark({ minRank: 1 });
  await rateLimit(`spin:${d.user.id}`, 120, 3600);
  const admin = supabaseAdmin();
  const tiers = tiersUpTo(d.rank);
  const { data: dares } = await admin.from("dares").select("id, tier, text, needs_media").in("tier", tiers).eq("enabled", true).or(`couple_id.is.null,couple_id.eq.${d.coupleId}`);
  if (!dares?.length) throw deny(404, "no_dares", "No dares yet in your tiers.");
  // Avoid the last 10 dares this couple saw.
  const { data: recent } = await admin.from("dare_spins").select("dare_id").eq("couple_id", d.coupleId).order("created_at", { ascending: false }).limit(10);
  const seen = new Set((recent ?? []).map((r) => r.dare_id));
  const pool = dares.filter((x) => !seen.has(x.id));
  const pick = (pool.length ? pool : dares)[Math.floor(Math.random() * (pool.length || dares.length))]!;
  const { data: spin } = await admin.from("dare_spins").insert({ couple_id: d.coupleId, spinner_id: d.user.id, dare_id: pick.id, tier: pick.tier }).select("id").single();
  return ok({ spinId: spin!.id, tier: pick.tier, dare: pick.text, needsMedia: pick.needs_media, tiers });
});

/** History (DARK-05): recent outcomes and a streak of days with a dare done. No streak counts media. */
export const GET = handler(async () => {
  const d = await requireDark({ minRank: 1 });
  const { data } = await supabaseAdmin().from("dare_spins").select("id, tier, outcome, created_at, resolved_at, spinner_id, dares(text, needs_media)").eq("couple_id", d.coupleId).not("outcome", "is", null).order("created_at", { ascending: false }).limit(30);
  const doneDays = new Set(
    (data ?? []).filter((s) => s.outcome === "done" && !(s.dares as unknown as { needs_media: boolean } | null)?.needs_media).map((s) => s.created_at.slice(0, 10)),
  );
  let streak = 0;
  for (let day = new Date(); ; day = new Date(day.getTime() - 86400000)) {
    if (doneDays.has(day.toISOString().slice(0, 10))) streak++;
    else if (streak > 0 || day.toISOString().slice(0, 10) !== new Date().toISOString().slice(0, 10)) break;
  }
  return ok({
    streak,
    history: (data ?? []).map((s) => ({ id: s.id, tier: s.tier, outcome: s.outcome, at: s.created_at, mine: s.spinner_id === d.user.id, text: (s.dares as unknown as { text: string } | null)?.text })),
  });
});
