import { z } from "zod";
import { handler, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { storage } from "@/lib/storage";

/** An admin opens one shared (never private) photo, video or voice note. Logged. */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw deny(404, "not_found", "Not found.");
  const a = await requireAdmin({ rate: 600 });
  const { data: m } = await supabaseAdmin()
    .from("media")
    .select("owner_id, storage_path, is_sensitive, deleted_at, bucket")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.deleted_at || m.is_sensitive) throw deny(404, "not_found", "Not found.");
  await adminAudit(a.user.id, "media_access", { media_id: id, admin: a.account.email }, m.owner_id);
  const url = await (await storage()).presignRead("media", m.storage_path, 300);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
});
