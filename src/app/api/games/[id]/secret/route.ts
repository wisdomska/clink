import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Draw and guess: only the current drawer can see the current word. */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: g } = await admin.from("games").select("couple_id, type, state, status").eq("id", id).maybeSingle();
  if (!g || g.couple_id !== coupleId || g.type !== "draw_guess") throw deny(404, "not_found", "Not found.");
  const s = g.state as { drawer: string; turn: number };
  if (s.drawer !== user.id || g.status !== "active") throw deny(403, "not_drawer", "No peeking.");
  const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", id).single();
  return ok({ word: (sec?.data as { words: string[] }).words[s.turn] });
});
