import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { handler, ok, parseJson, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cleanPath, isPrivatePath } from "@/lib/server/error-log";

const ms = z.number().int().min(0).max(60_000);
const schema = z.object({
  path: z.string().max(500),
  lcp: ms,
  // Where the time went (lib/report splitLcp). Optional: older pages send the total only.
  detail: z
    .object({
      server: ms,
      wait: ms,
      fetch: ms,
      render: ms,
      element: z
        .string()
        .max(20)
        .regex(/^[a-z0-9-]*$/),
      net: z
        .string()
        .max(10)
        .regex(/^[a-z0-9-]*$/)
        .optional(),
      installed: z.boolean(),
      warm: z.boolean(),
    })
    .optional(),
});

/**
 * How long a screen took to show its main content on first load (see
 * lib/report). Path and milliseconds only, for the weekly health summary.
 * Private screens are dropped; limited per address.
 */
export const POST = handler(async (req) => {
  // Behind Vercel there's always a real forwarded address. Without one (or with
  // a loopback one) it's a local or test server, where one machine loads every
  // page and a limit would only drop real measurements.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const v = await parseJson(req, schema);
  const path = cleanPath(v.path);
  if (!path || isPrivatePath(path)) return ok({ logged: false });
  after(async () => {
    try {
      if (ip && !/^(127\.|::1$|::ffff:127\.)/.test(ip)) await rateLimit(`vitals:${ip}`, 120, 3600);
      await supabaseAdmin().rpc("svc_log_page_timing", {
        p_path: path,
        p_lcp_ms: v.lcp,
        p_detail: v.detail ?? null,
      });
    } catch {
      /* best effort */
    }
  });
  return ok({ logged: true });
});
