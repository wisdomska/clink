import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { asJson } from "@/lib/server/games";
import { notifyLater } from "@/lib/server/push";

/**
 * Quit a game you're in: it ends now and your partner takes the win. An
 * invite that was never joined is simply called off.
 */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`game-forfeit:${user.id}`, 60, 3600);
  const admin = supabaseAdmin();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: game } = await admin.from("games").select("*").eq("id", id).maybeSingle();
    if (!game || game.couple_id !== coupleId) throw deny(404, "not_found", "Game not found.");
    if (game.status === "invited") {
      await admin.from("games").update({ status: "abandoned" }).eq("id", id);
      return ok({ forfeited: false, cancelled: true });
    }
    if (game.status !== "active") throw deny(409, "over", "That game has already finished.");
    const state = { ...(game.state as Record<string, unknown>), forfeitBy: user.id };
    const { data: sec } = await admin
      .from("game_secrets")
      .select("data")
      .eq("game_id", id)
      .maybeSingle();
    const { data: saved, error } = await admin.rpc("svc_apply_game_move", {
      p_game_id: id,
      p_expected_updated_at: game.updated_at,
      p_state: asJson(state),
      p_secrets: asJson(sec?.data ?? {}),
      p_current_turn_user: null as unknown as string,
      p_status: "finished",
      p_winner_id: partnerId,
      p_is_draw: false,
      p_scores: asJson(game.scores),
      p_finished_at: new Date().toISOString(),
    });
    if (error) throw error;
    if (saved) {
      const { data: me } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      notifyLater(partnerId, "games", {
        body: `${me?.display_name ?? "They"} forfeited. You win.`,
        url: `/play/${game.type}/${id}`,
        tag: `game-${id}`,
      });
      return ok({ forfeited: true });
    }
  }
  throw deny(409, "conflict", "They just moved. Try again.");
});
