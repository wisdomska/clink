import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";
import { keysetFilter, pageParams, toPage } from "@/features/plans/cursor";

/**
 * DARK-08 vault: kept items, plus still-viewable expiring and unopened View
 * once items. Metadata only; bytes come from /api/media/:id/view one at a time.
 * Paged newest first with a (created_at, id) cursor. The first page also says
 * how many items are still there in total, for the After Dark hub.
 */
export const GET = handler(async (req) => {
  const d = await requireDark({ minRank: 1 });
  const { cursor, limit } = pageParams(req.nextUrl);
  const nowIso = new Date().toISOString();
  // Same rule as before, now in SQL so every page is full: kept items always
  // (a removed one shows as "Removed by sender"), anything else only while viewable.
  const visible = `retention.eq.vault,and(deleted_at.is.null,closed_at.is.null,or(expires_at.is.null,expires_at.gt."${nowIso}"))`;
  const base = () =>
    supabaseAdmin()
      .from("media")
      .select(
        "id, owner_id, kind, retention, expires_at, created_at, deleted_at, closed_at, duration_s",
      )
      .eq("couple_id", d.coupleId)
      .eq("is_sensitive", true)
      .neq("status", "pending");
  const { data, error } = await base()
    .or(cursor ? `and(or(${visible}),or(${keysetFilter("created_at", cursor, "desc")}))` : visible)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  let kept: number | undefined;
  if (!cursor) {
    const { count } = await supabaseAdmin()
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", d.coupleId)
      .eq("is_sensitive", true)
      .neq("status", "pending")
      .is("deleted_at", null)
      .or(visible);
    kept = count ?? 0;
  }
  const page = toPage(
    data ?? [],
    limit,
    (m) => m.created_at,
    (m) => m.id,
  );
  return ok({
    items: page.items.map((m) => ({
      id: m.id,
      mine: m.owner_id === d.user.id,
      kind: m.kind,
      retention: m.retention,
      expiresAt: m.expires_at,
      at: m.created_at,
      removed: Boolean(m.deleted_at),
      duration: m.duration_s,
    })),
    nextCursor: page.nextCursor,
    ...(kept === undefined ? {} : { kept }),
  });
});
