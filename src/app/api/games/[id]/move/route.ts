import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { applyMove, playersFor, asJson } from "@/lib/server/games";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";
import type { GameType } from "@/features/play/engines/types";

const schema = z.object({ move: z.record(z.string(), z.unknown()) });

/** The server is the referee: every move runs through the engine here. */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  await rateLimit(`game-move:${user.id}`, 900, 3600);
  const { move } = await parseJson(req, schema);
  const admin = supabaseAdmin();
  // Both partners often answer at the same moment. Read, apply and save
  // atomically; if someone else moved in between, re-read and apply again.
  let attempt = 0;
  let g;
  let r;
  for (;;) {
    const { data: game } = await admin.from("games").select("*").eq("id", id).maybeSingle();
    if (!game || game.couple_id !== coupleId) throw deny(404, "not_found", "Game not found.");
    if (game.status !== "active")
      throw deny(
        409,
        game.status === "invited" ? "not_started" : "over",
        game.status === "invited" ? "Waiting for them to join." : "That game has finished.",
      );
    const { data: sec } = await admin
      .from("game_secrets")
      .select("data")
      .eq("game_id", id)
      .single();
    const p = await playersFor(coupleId, game.created_by);
    const res = applyMove(game.type as GameType, p, game.state, sec?.data ?? {}, user.id, move);
    if ("correct" in res && res.correct === false) return ok({ correct: false });
    const { data: saved, error } = await admin.rpc("svc_apply_game_move", {
      p_game_id: id,
      p_expected_updated_at: game.updated_at,
      p_state: asJson(res.state),
      p_secrets: asJson(res.secrets),
      p_current_turn_user: (res.turn === undefined ? game.current_turn_user : res.turn) as string,
      p_status: res.finished ? "finished" : "active",
      p_winner_id: (res.finished ? (res.winnerId ?? null) : null) as string,
      p_is_draw: Boolean(res.finished && res.isDraw),
      p_scores: asJson(res.scores ?? game.scores),
      p_finished_at: (res.finished ? new Date().toISOString() : null) as string,
    });
    if (error) throw error;
    if (saved) {
      g = game;
      r = res;
      break;
    }
    if (++attempt >= 5) throw deny(409, "conflict", "They just moved. Try again.");
  }
  if (g.mode === "turn")
    await admin
      .from("game_moves")
      .insert({ game_id: id, couple_id: coupleId, user_id: user.id, move: asJson(move) });
  if (r.notifyTurn) {
    const { data: me } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    await notify(r.notifyTurn, "games", {
      body: `Your turn. ${me?.display_name ?? "They"} just played.`,
      url: `/play/${g.type}/${id}`,
      tag: `game-${id}`,
    });
  }
  if (r.finished)
    await track("activity_completed", user.id, { type: "game", mode: g.mode }, coupleId);
  return ok({ correct: "correct" in r ? r.correct : undefined, finished: Boolean(r.finished) });
});
