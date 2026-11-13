import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** The invited partner accepts a live game. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: g } = await admin.from("games").select("id, couple_id, status, created_by, type, state").eq("id", id).maybeSingle();
  if (!g || g.couple_id !== coupleId) throw deny(404, "not_found", "Game not found.");
  if (g.status === "active") return ok({ ok: true });
  if (g.status !== "invited") throw deny(409, "over", "That game has finished.");
  if (g.created_by === user.id) throw deny(409, "own_invite", "Waiting for them to join.");
  // Draw and guess: the clock starts when both are in.
  const state = g.type === "draw_guess" ? { ...(g.state as object), turnStartedAt: new Date().toISOString() } : g.state;
  await admin.from("games").update({ status: "active", state }).eq("id", id);
  return ok({ ok: true });
});
