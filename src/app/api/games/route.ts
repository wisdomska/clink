import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { initGame, playersFor, LIVE, asJson } from "@/lib/server/games";
import { notify } from "@/lib/server/push";

const schema = z.object({
  type: z.enum([
    "know_me",
    "draw_guess",
    "trivia",
    "wyr",
    "word",
    "story",
    "rps",
    "snap",
    "zoom",
    "memory",
  ]),
  deck: z.enum(["Silly", "Deep", "Future", "Travel"]).optional(),
  subject: z.enum(["me", "partner"]).optional(),
});

const NAMES: Record<string, string> = {
  know_me: "How well do you know me",
  draw_guess: "Draw and guess",
  trivia: "Trivia duel",
  wyr: "Would you rather",
  word: "Word game",
  story: "Story builder",
  rps: "Rock paper scissors",
  snap: "Snap challenge",
  zoom: "Zoom guess",
  memory: "Photo memory",
};

/** PLAY-01: start a game. Live games begin as an invite; turn-based games start at once. */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`game-new:${user.id}`, 60, 3600);
  const body = await parseJson(req, schema);
  const admin = supabaseAdmin();
  const live = LIVE.includes(body.type);
  if (live) {
    // One open invite per game type: re-inviting refreshes it.
    await admin
      .from("games")
      .update({ status: "abandoned" })
      .eq("couple_id", coupleId)
      .eq("type", body.type)
      .eq("status", "invited");
  }
  const p = await playersFor(coupleId, user.id);
  const r = await initGame(body.type, p, {
    deck: body.deck,
    subject: body.subject === "me" ? user.id : body.subject === "partner" ? partnerId : undefined,
    coupleId,
  });
  const { data: game, error } = await admin
    .from("games")
    .insert({
      couple_id: coupleId,
      type: body.type,
      mode: live ? "live" : "turn",
      status: live ? "invited" : "active",
      state: asJson(r.state),
      current_turn_user: r.turn ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !game) throw error;
  await admin.from("game_secrets").insert({ game_id: game.id, data: asJson(r.secrets) });
  const { data: me } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  await notify(partnerId, "games", {
    body: `${me?.display_name ?? "Your person"} wants to play ${NAMES[body.type]}`,
    url: `/play/${body.type}/${game.id}`,
    tag: `game-${game.id}`,
  });
  return ok({ id: game.id }, { status: 201 });
});
