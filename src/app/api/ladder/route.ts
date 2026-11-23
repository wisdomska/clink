import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyLater } from "@/lib/server/push";
import { isWord } from "@/lib/server/dictionary";
import { ladderFor } from "@/lib/server/ladder";
import { ladderProblem, MAX_STEPS } from "@/lib/ladder";

/** The couple's day (from the device) must be today, give or take a time zone. */
function checkDay(day: string | null) {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw deny(400, "bad_day", "Which day?");
  const diff = Math.abs(Date.parse(`${day}T12:00:00Z`) - Date.now()) / 86400_000;
  if (!(diff <= 1.6)) throw deny(400, "bad_day", "That's not today.");
  return day;
}

/**
 * Today's ladder: the puzzle, your result, and your partner's, which stays
 * hidden (only whether they've finished) until you've finished yours.
 */
export const GET = handler(async (req: NextRequest) => {
  const { user, coupleId, partnerId } = await requireCouple();
  const day = checkDay(req.nextUrl.searchParams.get("day"));
  const puzzle = await ladderFor(day);
  const { data: rows } = await supabaseAdmin()
    .from("ladder_results")
    .select("user_id, path, steps, seconds, hints")
    .eq("couple_id", coupleId)
    .eq("day", day);
  const mine = rows?.find((r) => r.user_id === user.id) ?? null;
  const theirs = rows?.find((r) => r.user_id === partnerId) ?? null;
  return ok({
    day,
    start: puzzle.start,
    target: puzzle.target,
    par: puzzle.par,
    mine: mine && { path: mine.path, steps: mine.steps, seconds: mine.seconds, hints: mine.hints },
    theirs: theirs
      ? mine
        ? {
            done: true,
            path: theirs.path,
            steps: theirs.steps,
            seconds: theirs.seconds,
            hints: theirs.hints,
          }
        : { done: true }
      : { done: false },
  });
});

const schema = z.object({
  day: z.string(),
  path: z
    .array(z.string().regex(/^[a-z]{4}$/))
    .min(2)
    .max(MAX_STEPS + 1),
  seconds: z.number().int().min(0).max(86400),
  hints: z.number().int().min(0).max(30).optional(),
});

/** Hand in your ladder: every step is checked here. One go a day. */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`ladder:${user.id}`, 60, 3600);
  const body = await parseJson(req, schema);
  const day = checkDay(body.day);
  const puzzle = await ladderFor(day);
  const problem = ladderProblem(body.path, puzzle.start, puzzle.target, isWord);
  if (problem) throw deny(422, "bad_ladder", problem);
  const steps = body.path.length - 1;
  const admin = supabaseAdmin();
  const { error } = await admin.from("ladder_results").insert({
    couple_id: coupleId,
    day,
    user_id: user.id,
    path: body.path,
    steps,
    // A person can't climb faster than about a second a step.
    seconds: Math.max(body.seconds, steps),
    hints: body.hints ?? 0,
  });
  if (error?.code === "23505") throw deny(409, "already", "You've done today's ladder.");
  if (error) throw error;
  const { data: theirs } = await admin
    .from("ladder_results")
    .select("user_id")
    .eq("couple_id", coupleId)
    .eq("day", day)
    .eq("user_id", partnerId)
    .maybeSingle();
  if (!theirs) {
    const { data: me } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    notifyLater(partnerId, "games", {
      body: `${me?.display_name ?? "Your partner"} climbed today's ladder in ${steps} steps. Your turn.`,
      url: "/play/ladder",
      tag: `ladder-${day}`,
    });
  }
  return ok({ steps, par: puzzle.par });
});
