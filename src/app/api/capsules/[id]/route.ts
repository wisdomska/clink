import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { uuid } from "@/lib/validation";

/** GET /api/capsules/:id: refused before unlock_at, for both partners, author included. */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const { coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: c } = await admin
    .from("capsules")
    .select("id, couple_id, title, unlock_at, opened_at, author_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.couple_id !== coupleId) throw deny(404, "not_found", "Not found.");
  if (new Date(c.unlock_at) > new Date())
    throw deny(423, "locked", "Neither of you can open it early. That's the point.");
  const { data: content } = await admin
    .from("capsule_contents")
    .select("body, media_id")
    .eq("capsule_id", id)
    .single();
  let media: { id: string; kind: string; duration_s: number | null } | null = null;
  if (content?.media_id) {
    const { data: m } = await admin
      .from("media")
      .select("id, kind, duration_s, deleted_at")
      .eq("id", content.media_id)
      .maybeSingle();
    if (m && !m.deleted_at) media = { id: m.id, kind: m.kind, duration_s: m.duration_s };
  }
  return ok({ capsule: c, body: content?.body ?? null, media });
});
