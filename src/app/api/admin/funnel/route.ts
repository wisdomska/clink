import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

/** Where new people get stuck between signing up and their first clink. Counts only. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const { data, error } = await supabaseAdmin().rpc("svc_signup_funnel", { p_days: days });
  if (error) throw error;
  return ok(data);
});
