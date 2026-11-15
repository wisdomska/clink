import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Edit your own text message within 15 minutes (WhatsApp style). */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  await rateLimit(`msg-edit:${user.id}`, 120, 3600);
  const { body } = await parseJson(req, z.object({ body: z.string().trim().min(1).max(4000) }));
  const db = supabaseAdmin();
  const { data: m } = await db
    .from("messages")
    .select("sender_id, couple_id, type, sent_at, removed_at")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.couple_id !== coupleId || m.sender_id !== user.id)
    throw deny(404, "not_found", "That message isn't yours to edit.");
  if (m.type !== "text" || m.removed_at)
    throw deny(422, "not_text", "Only text messages can be edited.");
  if (Date.now() - new Date(m.sent_at).getTime() > EDIT_WINDOW_MS)
    throw deny(422, "too_late", "Messages can be edited for 15 minutes.");
  const { data, error } = await db
    .from("messages")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return ok({ message: data });
});
