import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { handler, ok, parseJson, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cleanPath, isPrivatePath } from "@/lib/server/error-log";

const schema = z.object({ path: z.string().max(500), lcp: z.number().int().min(0).max(120_000) });

/**
 * How long a screen took to show its main content on first load (see
 * lib/report). Path and milliseconds only, for the weekly health summary.
 * Private screens are dropped; limited per address.
 */
export const POST = handler(async (req) => {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const v = await parseJson(req, schema);
  const path = cleanPath(v.path);
  if (!path || isPrivatePath(path)) return ok({ logged: false });
  after(async () => {
    try {
      await rateLimit(`vitals:${ip}`, 120, 3600);
      await supabaseAdmin().rpc("svc_log_page_timing", { p_path: path, p_lcp_ms: v.lcp });
    } catch {
      /* best effort */
    }
  });
  return ok({ logged: true });
});
