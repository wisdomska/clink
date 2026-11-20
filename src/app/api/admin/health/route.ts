import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

/** The weekly health summary: errors, calls and page speed. Aggregates only. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));
  const { data, error } = await supabaseAdmin().rpc("svc_weekly_health", { p_days: days });
  if (error) throw error;
  return ok(data);
});
