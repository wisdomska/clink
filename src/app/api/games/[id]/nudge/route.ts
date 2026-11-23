import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyLater } from "@/lib/server/push";
import { GAME_META } from "@/features/play/meta";
import type { GameType } from "@/features/play/engines/types";

const NUDGE_AFTER_MS = 12 * 3600_000;

/** Whether you can nudge now, or from when. */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: g } = await admin
    .from("games")
    .select("couple_id, mode, status, current_turn_user, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!g || g.couple_id !== coupleId) throw deny(404, "not_found", "Game not found.");
  const { data: n } = await admin
    .from("game_nudges")
    .select("turn_since, at")
    .eq("game_id", id)
    .maybeSingle();
  const waiting = g.mode === "turn" && g.status === "active" && g.current_turn_user !== user.id;
  const nudged = Boolean(n && n.turn_since >= g.updated_at);
  return ok({
    waiting,
    nudged,
    from: new Date(Date.parse(g.updated_at) + NUDGE_AFTER_MS).toISOString(),
  });
});

/** Nudge your partner: once per turn, after their move has waited 12 hours. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`game-nudge:${user.id}`, 30, 3600);
  const admin = supabaseAdmin();
  const { data: r, error } = await admin.rpc("svc_nudge_game", { p_game: id, p_user: user.id });
  if (error) throw error;
  if (r === "not_found") throw deny(404, "not_found", "Game not found.");
  if (r === "over") throw deny(409, "over", "That game has finished.");
  if (r === "your_turn") throw deny(409, "your_turn", "It's your move.");
  if (r === "not_yet")
    throw deny(429, "not_yet", "Give them a little longer: you can nudge after 12 hours.");
  if (r === "already") throw deny(409, "already", "You've nudged them for this move already.");
  const [{ data: g }, { data: me }] = await Promise.all([
    admin.from("games").select("type, couple_id").eq("id", id).single(),
    admin.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);
  if (g && g.couple_id === coupleId)
    notifyLater(partnerId, "games", {
      body: `${me?.display_name ?? "Your partner"} is waiting on your move in ${GAME_META[g.type as GameType]?.name ?? "your game"}.`,
      url: `/play/${g.type}/${id}`,
      tag: `game-${id}`,
    });
  return ok({ nudged: true });
});
