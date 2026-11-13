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
  const { data: g } = await admin.from("games").select("*").eq("id", id).maybeSingle();
  if (!g || g.couple_id !== coupleId) throw deny(404, "not_found", "Game not found.");
  if (g.status !== "active")
    throw deny(
      409,
      g.status === "invited" ? "not_started" : "over",
      g.status === "invited" ? "Waiting for them to join." : "That game has finished.",
    );
  const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", id).single();
  const p = await playersFor(coupleId, g.created_by);
  const r = applyMove(g.type as GameType, p, g.state, sec?.data ?? {}, user.id, move);
  if ("correct" in r && r.correct === false) return ok({ correct: false });

  const patch = {
    state: asJson(r.state),
    current_turn_user: r.turn === undefined ? g.current_turn_user : r.turn,
    status: r.finished ? ("finished" as const) : ("active" as const),
    winner_id: r.finished ? (r.winnerId ?? null) : null,
    is_draw: Boolean(r.finished && r.isDraw),
    scores: asJson(r.scores ?? g.scores),
    finished_at: r.finished ? new Date().toISOString() : null,
  };
  // Optimistic concurrency: only apply if nobody moved in between.
  const { data: updated } = await admin
    .from("games")
    .update(patch)
    .eq("id", id)
    .eq("updated_at", g.updated_at)
    .select("id")
    .maybeSingle();
  if (!updated) throw deny(409, "conflict", "They just moved. Try again.");
  await admin
    .from("game_secrets")
    .update({ data: asJson(r.secrets) })
    .eq("game_id", id);
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
