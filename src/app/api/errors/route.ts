import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { handler, ok, parseJson, rateLimit } from "@/lib/server/api";
import { logError } from "@/lib/server/error-log";

const schema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(8000).optional(),
  path: z.string().max(500).optional(),
});

/**
 * Browser errors land here (see lib/report). No account needed, so errors on
 * the sign-in screens count too; limited per address. Private screens are
 * dropped before anything is stored.
 */
export const POST = handler(async (req) => {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  await rateLimit(`client-error:${ip}`, 60, 3600);
  const e = await parseJson(req, schema);
  const userAgent = h.get("user-agent");
  after(() => logError({ source: "client", ...e, userAgent }));
  return ok({ logged: true });
});
