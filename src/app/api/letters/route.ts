import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";
import { keysetFilter, pageParams, toPage } from "@/features/plans/cursor";

const schema = z.object({
  condition: z.string().trim().min(3).max(80),
  body: z.string().trim().min(1).max(6000),
  mediaId: z.uuid().optional(),
});

/** KEEP-01: seal an Open When letter for your partner. */
export const POST = handler(async (req) => {
  const { user, db, coupleId, partnerId } = await requireCouple();
  await rateLimit(`letter:${user.id}`, 30, 3600);
  const body = await parseJson(req, schema);
  if (body.mediaId) {
    const { data: m } = await supabaseAdmin()
      .from("media")
      .select("owner_id, couple_id, is_sensitive, status")
      .eq("id", body.mediaId)
      .maybeSingle();
    if (
      !m ||
      m.owner_id !== user.id ||
      m.couple_id !== coupleId ||
      m.is_sensitive ||
      m.status !== "ready"
    )
      throw deny(422, "bad_media", "That attachment didn't upload.");
  }
  const condition = body.condition.toLowerCase().startsWith("open when")
    ? body.condition
    : `Open when ${body.condition}`;
  const { data, error } = await db
    .from("letters")
    .insert({
      couple_id: coupleId,
      author_id: user.id,
      condition,
      body: body.body,
      media_id: body.mediaId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  await notify(partnerId, "keepsakes", {
    body: `A letter is waiting: "${condition}"`,
    url: `/keep/letters/${data.id}`,
  });
  await track("activity_completed", user.id, { type: "letter", mode: "turn" }, coupleId);
  return ok({ id: data.id }, { status: 201 });
});

/**
 * KEEP-01 list: one page of letters, newest first, metadata only (never the
 * body). `author=me` is "Sealed by you", `author=partner` is "Open when, from".
 * Reads through the caller's own session, so RLS decides what's visible.
 */
export const GET = handler(async (req) => {
  const { user, db, partnerId } = await requireCouple();
  const { cursor, limit } = pageParams(req.nextUrl);
  const author = req.nextUrl.searchParams.get("author") === "partner" ? partnerId : user.id;
  let q = db
    .from("letters")
    .select("id, author_id, condition, sealed_at, opened_at")
    .eq("author_id", author);
  if (cursor) q = q.or(keysetFilter("sealed_at", cursor, "desc"));
  const { data, error } = await q
    .order("sealed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  return ok(
    toPage(
      data ?? [],
      limit,
      (r) => r.sealed_at,
      (r) => r.id,
    ),
  );
});
