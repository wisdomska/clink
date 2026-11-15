import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

const KEYS = ["signups", "links", "clinks", "messages", "games", "active_couples"] as const;
type Key = (typeof KEYS)[number];

/** Daily counts for the last 7 or 30 days, with totals for this and the previous period. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const days = req.nextUrl.searchParams.get("days") === "30" ? 30 : 7;
  const { data, error } = await supabaseAdmin().rpc("svc_admin_trends", { p_days: days });
  if (error) throw error;
  const rows = data ?? [];
  const previous = rows.slice(0, rows.length - days);
  const current = rows.slice(-days);
  const sum = (list: typeof rows, k: Key) => list.reduce((n, r) => n + (r[k] ?? 0), 0);
  // Active couples: peak day, not a sum (the same couple is active many days).
  const peak = (list: typeof rows, k: Key) => list.reduce((n, r) => Math.max(n, r[k] ?? 0), 0);
  const totals = Object.fromEntries(
    KEYS.map((k) => [
      k,
      {
        current: k === "active_couples" ? peak(current, k) : sum(current, k),
        previous: k === "active_couples" ? peak(previous, k) : sum(previous, k),
      },
    ]),
  );
  return ok({ days, series: current, totals });
});
