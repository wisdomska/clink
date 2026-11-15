import { z } from "zod";
import { handler, ok, parseJson, deny, activeCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";

/**
 * Admin content access: read a user's current chat. A reason is required and
 * every page read is written to the audit log. After Dark content (private
 * media, decks, dares, answers) is never included.
 */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const a = await requireAdmin({ rate: 120 });
  const { reason, before } = await parseJson(
    req,
    z.object({
      reason: z.string().trim().min(5, "Say why you need to look.").max(300),
      before: z.iso.datetime().optional(),
    }),
  );
  const couple = await activeCouple(id);
  if (!couple) throw deny(404, "no_couple", "They aren't linked, so there's no chat.");
  const db = supabaseAdmin();
  let q = db
    .from("messages")
    .select("id, sender_id, type, body, media_ids, sticker_id, sent_at, removed_at, reply_to")
    .eq("couple_id", couple.coupleId)
    .order("sent_at", { ascending: false })
    .limit(100);
  if (before) q = q.lt("sent_at", before);
  const { data: rows, error } = await q;
  if (error) throw error;
  const mediaIds = [...new Set((rows ?? []).flatMap((r) => r.media_ids ?? []))];
  const { data: media } = mediaIds.length
    ? await db.from("media").select("id, kind, is_sensitive, duration_s").in("id", mediaIds)
    : { data: [] };
  const mediaInfo = new Map((media ?? []).map((m) => [m.id, m]));
  const [{ data: people }] = await Promise.all([
    db.from("profiles").select("id, display_name").in("id", [id, couple.partnerId]),
  ]);
  await adminAudit(
    a.user.id,
    "content_access",
    {
      reason,
      couple_id: couple.coupleId,
      messages: rows?.length ?? 0,
      page: before ?? "latest",
      admin: a.account.email,
    },
    id,
  );
  return ok({
    people: Object.fromEntries((people ?? []).map((p) => [p.id, p.display_name ?? "No name"])),
    messages: (rows ?? []).reverse().map((r) => ({
      ...r,
      // Removed messages stay removed; private (After Dark) items are never shown.
      body: r.removed_at || r.type === "sensitive" ? null : r.body,
      media:
        r.removed_at || r.type === "sensitive"
          ? []
          : (r.media_ids ?? [])
              .map((m) => mediaInfo.get(m))
              .filter((m): m is NonNullable<typeof m> => Boolean(m) && !m!.is_sensitive)
              .map((m) => ({ id: m.id, kind: m.kind, duration: m.duration_s })),
    })),
    more: (rows?.length ?? 0) === 100,
  });
});
