import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

/** The error log, newest first (last 30 days; ?source=client|server). */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const source = req.nextUrl.searchParams.get("source");
  let q = supabaseAdmin()
    .from("error_log")
    .select("id, source, message, stack, path, release, user_agent, count, first_at, last_at, day")
    .order("last_at", { ascending: false })
    .limit(200);
  if (source === "client" || source === "server") q = q.eq("source", source);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const since = Date.now() - 86_400_000;
  return ok({
    errors: rows,
    today: rows
      .filter((r) => new Date(r.last_at).getTime() > since)
      .reduce((n, r) => n + r.count, 0),
  });
});
