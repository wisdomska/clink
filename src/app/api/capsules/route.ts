import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";

const schema = z.object({
  title: z.string().trim().min(1).max(60),
  unlockAt: z.iso.datetime({ offset: true }),
  body: z.string().trim().max(6000).optional(),
  mediaId: z.uuid().optional(),
});

/** KEEP-02: seal a time capsule. Neither of you can open it before its date. */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`capsule:${user.id}`, 20, 3600);
  const body = await parseJson(req, schema);
  if (!body.body && !body.mediaId) throw deny(422, "empty", "Put something inside first.");
  const unlock = new Date(body.unlockAt);
  if (unlock.getTime() < Date.now() + 60 * 60 * 1000) throw deny(422, "too_soon", "Pick a date at least an hour away.");
  if (unlock.getTime() > Date.now() + 10 * 365 * 24 * 3600 * 1000) throw deny(422, "too_far", "Ten years is our limit.");
  const admin = supabaseAdmin();
  if (body.mediaId) {
    const { data: m } = await admin.from("media").select("owner_id, couple_id, is_sensitive, status").eq("id", body.mediaId).maybeSingle();
    if (!m || m.owner_id !== user.id || m.couple_id !== coupleId || m.is_sensitive || m.status !== "ready") throw deny(422, "bad_media", "That attachment didn't upload.");
  }
  const { data: c, error } = await admin.from("capsules").insert({ couple_id: coupleId, author_id: user.id, title: body.title, unlock_at: unlock.toISOString() }).select("id").single();
  if (error) throw error;
  await admin.from("capsule_contents").insert({ capsule_id: c.id, couple_id: coupleId, body: body.body ?? null, media_id: body.mediaId ?? null });
  await admin.from("timeline_entries").insert({ couple_id: coupleId, kind: "auto", title: `Sealed a bottle: ${body.title}`, happened_on: new Date().toISOString().slice(0, 10), source_key: `capsule:${c.id}` });
  await notify(partnerId, "keepsakes", { body: "A time capsule was sealed. It opens on its date.", url: `/keep/capsules/${c.id}` });
  await track("activity_completed", user.id, { type: "capsule", mode: "turn" }, coupleId);
  return ok({ id: c.id }, { status: 201 });
});
