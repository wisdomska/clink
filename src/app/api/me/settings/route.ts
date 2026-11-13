import { z } from "zod";
import { cookies } from "next/headers";
import { handler, ok, parseJson, requireUser } from "@/lib/server/api";
import { IDENTITY_COOKIE } from "@/lib/app-identity";
import type { Database, Json } from "@/types/database";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  notify: z.object({ clinks: z.boolean(), chat: z.boolean(), games: z.boolean(), dates: z.boolean(), keepsakes: z.boolean(), dark: z.boolean(), detailed: z.boolean() }).partial().optional(),
  quiet_start: time.optional(),
  quiet_end: time.optional(),
  app_icon: z.enum(["clink", "notes", "weather"]).optional(),
  discreet_mode: z.boolean().optional(),
});

/** SET-01 notification categories and quiet hours, SET-02 discreet identity. */
export const PATCH = handler(async (req) => {
  const { user, db } = await requireUser();
  const body = await parseJson(req, schema);
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (body.notify) {
    const { data } = await db.from("profiles").select("notify").eq("id", user.id).single();
    patch.notify = { ...((data?.notify as Record<string, Json>) ?? {}), ...body.notify };
  }
  if (body.quiet_start) patch.quiet_start = body.quiet_start;
  if (body.quiet_end) patch.quiet_end = body.quiet_end;
  if (body.app_icon) patch.app_icon = body.app_icon;
  if (body.discreet_mode !== undefined) patch.discreet_mode = body.discreet_mode;
  const { error } = await db.from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
  if (body.app_icon) {
    (await cookies()).set(IDENTITY_COOKIE, body.app_icon, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: true });
  }
  return ok({ ok: true });
});
