import { z } from "zod";
import { handler, ok, requireUser, deny, parseJson } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { uuid } from "@/lib/validation";

/** DELETE /api/media/:id: unsend. Owner only. Removes the object; partner sees "Removed by sender". */
export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const { user } = await requireUser();
  const admin = supabaseAdmin();
  const { data: m } = await admin
    .from("media")
    .select("id, owner_id, bucket, storage_path, deleted_at, couple_id")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.owner_id !== user.id) throw deny(404, "not_found", "Not found.");
  if (m.deleted_at) return ok({ ok: true });
  const s = await storage();
  await s.remove(m.bucket as "media" | "sensitive", [m.storage_path]);
  const gone = !(await s.exists(m.bucket as "media" | "sensitive", m.storage_path));
  const now = new Date().toISOString();
  await admin
    .from("media")
    .update({ status: "deleted", deleted_at: now, storage_verified_gone_at: gone ? now : null })
    .eq("id", id);
  return ok({ ok: true });
});

/** PATCH /api/media/:id: mark a shared photo as a favourite for the memory wall (never sensitive). */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { favourite } = await parseJson(req, z.object({ favourite: z.boolean() }));
  const { db } = await requireUser();
  const { error, data } = await db
    .from("media")
    .update({ is_favourite: favourite })
    .eq("id", id)
    .eq("is_sensitive", false)
    .select("id")
    .maybeSingle();
  if (error || !data) throw deny(404, "not_found", "Not found.");
  return ok({ ok: true });
});
