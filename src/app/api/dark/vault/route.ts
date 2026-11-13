import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";

/**
 * DARK-08 vault: kept items, plus still-viewable expiring and unopened View
 * once items. Metadata only; bytes come from /api/media/:id/view one at a time.
 */
export const GET = handler(async () => {
  const d = await requireDark({ minRank: 1 });
  const { data } = await supabaseAdmin()
    .from("media")
    .select(
      "id, owner_id, kind, retention, expires_at, created_at, deleted_at, closed_at, duration_s",
    )
    .eq("couple_id", d.coupleId)
    .eq("is_sensitive", true)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(90);
  const now = Date.now();
  const items = (data ?? [])
    .filter(
      (m) =>
        m.retention === "vault" ||
        (!m.deleted_at &&
          (!m.expires_at || new Date(m.expires_at).getTime() > now) &&
          !m.closed_at),
    )
    .map((m) => ({
      id: m.id,
      mine: m.owner_id === d.user.id,
      kind: m.kind,
      retention: m.retention,
      expiresAt: m.expires_at,
      at: m.created_at,
      removed: Boolean(m.deleted_at),
      duration: m.duration_s,
    }));
  return ok({ items });
});
