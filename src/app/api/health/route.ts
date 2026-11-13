import { supabaseAdmin } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";

/** Lightweight health check, also pinged by the keep-alive workflow so Supabase never pauses. */
export async function GET() {
  if (!isConfigured())
    return Response.json(
      { ok: true, db: "not_configured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  const t0 = Date.now();
  const { error } = await supabaseAdmin().from("feature_flags").select("key").limit(1);
  return Response.json(
    { ok: !error, db: error ? "error" : "ok", ms: Date.now() - t0 },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
