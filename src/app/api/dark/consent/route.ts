import { z } from "zod";
import { handler, ok, parseJson, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, effectiveRank, ensureAdultFor, TIERS } from "@/lib/server/dark";
import { track } from "@/lib/server/analytics";

/**
 * POST /api/dark/consent: PIN verified in session. Picking Unhinged records
 * the 18+ declaration in the same step. Lowering is always allowed, with no notice beyond
 * "After Dark settings changed".
 */
export const POST = handler(async (req) => {
  const d = await requireDark();
  await rateLimit(`dark-consent:${d.user.id}`, 30, 3600);
  const { tiers } = await parseJson(req, z.object({ tiers: z.array(z.enum(TIERS)).max(4) }));
  const admin = supabaseAdmin();
  if (tiers.includes("Unhinged")) await ensureAdultFor(d.user.id);
  const before = d.rank;
  await admin
    .from("dark_settings")
    .update({ opted_tiers: tiers, updated_at: new Date().toISOString() })
    .eq("user_id", d.user.id);
  const after = await effectiveRank(d.coupleId);
  if (after > before)
    await track("dark_tier_unlocked", d.user.id, { tier: TIERS[after - 1] }, d.coupleId);
  await audit("dark_consent_changed", d.user.id, { from: before, to: after });
  return ok({ rank: after });
});
