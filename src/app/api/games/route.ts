import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { initGame, playersFor, LIVE, asJson } from "@/lib/server/games";
import { notifyLater } from "@/lib/server/push";
import { keysetFilter, pageParams, toPage } from "@/features/plans/cursor";

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
    "oware",
    "fourup",
    "draughts",
  ]),
  size: z.union([z.literal(8), z.literal(10)]).optional(),
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
  oware: "Oware",
  fourup: "Four Up",
  draughts: "Draughts",
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
    size: body.size,
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
  notifyLater(partnerId, "games", {
    body: `${me?.display_name ?? "Your partner"} wants to play ${NAMES[body.type]}`,
    url: `/play/${body.type}/${game.id}`,
    tag: `game-${game.id}`,
  });
  return ok({ id: game.id }, { status: 201 });
});

/**
 * PLAY-08 history: one page of finished games, most recent first, for the
 * lobby's game history. Reads through the caller's session (RLS).
 */
export const GET = handler(async (req) => {
  const { db } = await requireCouple();
  const { cursor, limit } = pageParams(req.nextUrl);
  let q = db
    .from("games")
    .select("id, type, winner_id, is_draw, finished_at")
    .eq("status", "finished")
    .not("finished_at", "is", null);
  if (cursor) q = q.or(keysetFilter("finished_at", cursor, "desc"));
  const { data, error } = await q
    .order("finished_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  return ok(
    toPage(
      data ?? [],
      limit,
      (r) => r.finished_at!,
      (r) => r.id,
    ),
  );
});
