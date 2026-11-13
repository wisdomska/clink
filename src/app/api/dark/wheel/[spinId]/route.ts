import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { track } from "@/lib/server/analytics";

/** Record Do it / Pass / Spin again. Pass never shows a penalty, a counter or a guilt message. */
export const POST = handler(async (req, ctx: { params: Promise<{ spinId: string }> }) => {
  const { spinId } = await ctx.params;
  const d = await requireDark({ minRank: 1 });
  const { outcome } = await parseJson(
    req,
    z.object({ outcome: z.enum(["done", "passed", "respun"]) }),
  );
  const admin = supabaseAdmin();
  const { data: spin } = await admin
    .from("dare_spins")
    .select("couple_id, spinner_id, tier, outcome")
    .eq("id", spinId)
    .maybeSingle();
  if (!spin || spin.couple_id !== d.coupleId) throw deny(404, "not_found", "Not found.");
  if (spin.outcome) return ok({ ok: true });
  await admin
    .from("dare_spins")
    .update({ outcome, resolved_at: new Date().toISOString() })
    .eq("id", spinId);
  await track("dare_outcome", d.user.id, { tier: spin.tier, outcome }, d.coupleId);
  return ok({ ok: true });
});
