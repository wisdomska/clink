import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, FREE_LIMITS } from "@/lib/server/admin";
import { serverEnv } from "@/lib/env";

/** Aggregate metrics only. Never content. */
export const GET = handler(async () => {
  await requireAdmin();
  const admin = supabaseAdmin();
  const { data: m } = await admin.rpc("svc_admin_metrics");
  const metrics = (m ?? {}) as Record<string, number | Record<string, number>>;
  const { count: live } = await admin
    .from("presence")
    .select("user_id", { count: "exact", head: true })
    .gt("last_seen_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());
  const driver = serverEnv().STORAGE_DRIVER;
  return ok({
    metrics,
    usage: {
      db: { used: Number(metrics.db_bytes ?? 0), limit: FREE_LIMITS.db_bytes },
      storage: {
        used: Number(metrics.media_bytes ?? 0),
        limit: driver === "r2" ? FREE_LIMITS.r2_storage_bytes : FREE_LIMITS.supabase_storage_bytes,
        driver,
      },
      realtime: {
        used: (live ?? 0) * 2,
        limit: FREE_LIMITS.realtime_connections,
        note: "Estimate: two channels per user seen in the last 2 minutes.",
      },
    },
  });
});
