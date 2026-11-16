import { handler, ok, requireCouple } from "@/lib/server/api";
import { keysetFilter, pageParams, toPage } from "@/features/plans/cursor";

/**
 * KEEP-03 list: one page of timeline entries, most recent first. Reads through
 * the caller's own session, so RLS decides what's visible.
 */
export const GET = handler(async (req) => {
  const { db } = await requireCouple();
  const { cursor, limit } = pageParams(req.nextUrl);
  let q = db.from("timeline_entries").select("id, kind, title, happened_on, media_id, created_by");
  if (cursor) q = q.or(keysetFilter("happened_on", cursor, "desc"));
  const { data, error } = await q
    .order("happened_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  return ok(
    toPage(
      data ?? [],
      limit,
      (r) => r.happened_on,
      (r) => r.id,
    ),
  );
});
