import { handler, ok, requireUser, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { uuid } from "@/lib/validation";

/**
 * POST /api/media/:id/viewed: marks a View once item consumed and deletes the
 * object immediately (the expire-media job is the 60 s safety net).
 */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const { user } = await requireUser();
  const admin = supabaseAdmin();
  const { data: m } = await admin
    .from("media")
    .select("id, couple_id, owner_id, retention, storage_path, bucket, closed_at, viewed_at")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.retention !== "once" || m.owner_id === user.id)
    throw deny(404, "not_found", "Not found.");
  const { data: member } = await admin
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", m.couple_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) throw deny(404, "not_found", "Not found.");
  if (m.closed_at) return ok({ ok: true });
  const now = new Date().toISOString();
  await admin
    .from("media")
    .update({ closed_at: now, viewed_at: m.viewed_at ?? now })
    .eq("id", id);
  await admin
    .from("sensitive_view_events")
    .insert({ media_id: id, couple_id: m.couple_id, viewer_id: user.id, event: "close" });
  try {
    await (await storage()).remove(m.bucket as "sensitive", [m.storage_path]);
    await admin
      .from("media")
      .update({ status: "deleted", deleted_at: now, storage_verified_gone_at: now })
      .eq("id", id);
  } catch {
    /* expire-media job retries within 5 minutes */
  }
  return ok({ ok: true });
});
