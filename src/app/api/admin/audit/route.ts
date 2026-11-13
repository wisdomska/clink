import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

/** Audit log viewer with filters (event prefix, user, date range). */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const p = req.nextUrl.searchParams;
  let q = supabaseAdmin()
    .from("audit_events")
    .select("id, user_id, actor_id, event, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (p.get("event")) q = q.ilike("event", `${p.get("event")}%`);
  if (p.get("user")) q = q.or(`user_id.eq.${p.get("user")},actor_id.eq.${p.get("user")}`);
  if (p.get("from")) q = q.gte("created_at", p.get("from")!);
  if (p.get("to")) q = q.lte("created_at", p.get("to")!);
  const { data } = await q;
  return ok({ events: data ?? [] });
});
