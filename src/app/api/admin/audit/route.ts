import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { EXPORT_MAX, csvResponse, endOfDay, isDay, isUuid, paging } from "@/lib/server/admin-list";

const SORTS = ["created", "event"] as const;
const like = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Audit log with filters (event type, who did it, user, date range), sorting and
 * pages. ?format=csv exports the whole filtered set.
 */
export const GET = handler(async (req: NextRequest) => {
  const a = await requireAdmin();
  const p = req.nextUrl.searchParams;
  const pg = paging(p, { sorts: SORTS, sort: "created", dir: "desc" });
  let q = supabaseAdmin()
    .from("audit_events")
    .select("id, user_id, actor_id, event, meta, created_at", { count: "exact" })
    .order(pg.sort === "event" ? "event" : "created_at", { ascending: pg.dir === "asc" });
  if (pg.sort === "event") q = q.order("created_at", { ascending: false });
  q = q.order("id", { ascending: false });

  // Event type: a prefix such as "admin." or a full event key.
  const event = (p.get("event") ?? "").trim();
  if (event && /^[a-z0-9_.]{1,60}$/i.test(event)) q = q.ilike("event", `${like(event)}%`);
  // Who did it: a Clink user id, or (for admin portal accounts) part of the admin email.
  const actor = (p.get("actor") ?? "").trim().toLowerCase();
  if (isUuid(actor)) q = q.eq("actor_id", actor);
  else if (actor && /^[a-z0-9@._+-]{2,120}$/.test(actor))
    q = q.ilike("meta->>admin", `%${like(actor)}%`);
  // The person it was about (or who did it), by full user id.
  const user = (p.get("user") ?? "").trim().toLowerCase();
  if (isUuid(user)) q = q.or(`user_id.eq.${user},actor_id.eq.${user}`);
  if (isDay(p.get("from"))) q = q.gte("created_at", p.get("from")!);
  if (isDay(p.get("to"))) q = q.lte("created_at", endOfDay(p.get("to")!));

  q = pg.csv ? q.range(0, EXPORT_MAX - 1) : q.range(pg.from, pg.to);
  const { data, error, count } = await q;
  if (error) throw error;
  const events = data ?? [];

  if (pg.csv) {
    await adminAudit(a.user.id, "export", {
      table: "audit",
      rows: events.length,
      filters: { event: event || null, actor: actor || null, user: user || null },
    });
    return csvResponse(
      "clink-audit",
      events.map((e) => ({
        when: e.created_at,
        event: e.event,
        user: e.user_id ?? "",
        actor: e.actor_id ?? "",
        admin:
          e.meta && typeof e.meta === "object" && !Array.isArray(e.meta)
            ? ((e.meta as Record<string, unknown>).admin ?? "")
            : "",
        details: e.meta,
      })),
    );
  }
  return ok({
    events,
    total: count ?? events.length,
    page: pg.page,
    size: pg.size,
    sort: pg.sort,
    dir: pg.dir,
  });
});
