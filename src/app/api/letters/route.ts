import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";

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
    const { data: m } = await supabaseAdmin().from("media").select("owner_id, couple_id, is_sensitive, status").eq("id", body.mediaId).maybeSingle();
    if (!m || m.owner_id !== user.id || m.couple_id !== coupleId || m.is_sensitive || m.status !== "ready") throw deny(422, "bad_media", "That attachment didn't upload.");
  }
  const condition = body.condition.toLowerCase().startsWith("open when") ? body.condition : `Open when ${body.condition}`;
  const { data, error } = await db.from("letters").insert({ couple_id: coupleId, author_id: user.id, condition, body: body.body, media_id: body.mediaId ?? null }).select("id").single();
  if (error) throw error;
  await notify(partnerId, "keepsakes", { body: `A letter is waiting: "${condition}"`, url: `/keep/letters/${data.id}` });
  await track("activity_completed", user.id, { type: "letter", mode: "turn" }, coupleId);
  return ok({ id: data.id }, { status: 201 });
});
