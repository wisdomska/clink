import { supabaseAdmin } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";

/**
 * Lightweight health check, also pinged by the keep-alive workflow so Supabase
 * never pauses. `release` is the deployed commit (short), so the after-deploy
 * check knows when a push has gone live.
 */
const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
export async function GET() {
  if (!isConfigured())
    return Response.json(
      { ok: true, db: "not_configured", release },
      { headers: { "Cache-Control": "no-store" } },
    );
  const t0 = Date.now();
  const { error } = await supabaseAdmin().from("feature_flags").select("key").limit(1);
  return Response.json(
    { ok: !error, db: error ? "error" : "ok", ms: Date.now() - t0, release },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
