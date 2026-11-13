import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";
import { track } from "@/lib/server/analytics";

const schema = z
  .object({
    clientId: z.string().min(8).max(64),
    type: z.enum(["text", "voice", "media", "sticker"]),
    body: z.string().trim().max(4000).optional(),
    replyTo: z.uuid().optional(),
    mediaIds: z.array(z.uuid()).max(10).default([]),
    stickerId: z.string().max(40).optional(),
    partnerOnline: z.boolean().optional(),
  })
  .refine((m) => (m.type === "text" ? Boolean(m.body) : true), {
    message: "Say something first.",
    path: ["body"],
  })
  .refine((m) => (m.type === "media" || m.type === "voice" ? m.mediaIds.length > 0 : true), {
    message: "Attach something first.",
    path: ["mediaIds"],
  })
  .refine((m) => (m.type === "sticker" ? Boolean(m.stickerId) : true), {
    message: "Pick a sticker.",
    path: ["stickerId"],
  });

const PREVIEW: Record<string, string> = {
  voice: "sent a voice note",
  media: "sent a photo",
  sticker: "sent a sticker",
};

/**
 * Sends a chat message under the caller's RLS. client_id makes retries from
 * the offline queue idempotent: a repeat returns the stored row.
 */
export const POST = handler(async (req) => {
  const { user, db, coupleId, partnerId } = await requireCouple();
  await rateLimit(`msg:${user.id}`, 600, 3600);
  const m = await parseJson(req, schema);

  const { data: existing } = await db
    .from("messages")
    .select("*")
    .eq("sender_id", user.id)
    .eq("client_id", m.clientId)
    .maybeSingle();
  if (existing) return ok({ message: existing });

  if (m.mediaIds.length) {
    const { data: media } = await supabaseAdmin()
      .from("media")
      .select("id, owner_id, couple_id, is_sensitive, status, kind")
      .in("id", m.mediaIds);
    const okMedia = (media ?? []).filter(
      (x) =>
        x.owner_id === user.id &&
        x.couple_id === coupleId &&
        !x.is_sensitive &&
        x.status === "ready",
    );
    if (okMedia.length !== m.mediaIds.length)
      throw deny(422, "bad_media", "One of those files didn't finish uploading.");
    if (m.type === "voice" && okMedia.some((x) => x.kind !== "audio"))
      throw deny(422, "bad_media", "That isn't a voice note.");
  }
  if (m.replyTo) {
    const { data: r } = await db.from("messages").select("id").eq("id", m.replyTo).maybeSingle();
    if (!r) throw deny(422, "bad_reply", "That message is gone.");
  }

  const { data: row, error } = await db
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: user.id,
      client_id: m.clientId,
      type: m.type,
      body: m.body ?? null,
      reply_to: m.replyTo ?? null,
      media_ids: m.mediaIds,
      sticker_id: m.stickerId ?? null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: dup } = await db
        .from("messages")
        .select("*")
        .eq("sender_id", user.id)
        .eq("client_id", m.clientId)
        .single();
      return ok({ message: dup });
    }
    throw error;
  }
  if (m.type === "sticker" && m.stickerId) {
    await db
      .from("sticker_recents")
      .upsert({ user_id: user.id, sticker_id: m.stickerId, used_at: new Date().toISOString() });
  }
  if (!m.partnerOnline) {
    const { data: me } = await supabaseAdmin()
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const name = me?.display_name ?? "Your person";
    const detail =
      m.type === "text" ? `${name}: ${(m.body ?? "").slice(0, 80)}` : `${name} ${PREVIEW[m.type]}`;
    await notify(partnerId, "chat", { body: detail, url: "/chat", tag: "chat" });
  }
  await track("message_sent", user.id, { type: m.type }, coupleId);
  return ok({ message: row }, { status: 201 });
});
