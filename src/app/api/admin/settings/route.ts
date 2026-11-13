import { z } from "zod";
import { handler, ok, parseJson } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";

export const GET = handler(async () => {
  await requireAdmin();
  const admin = supabaseAdmin();
  const [{ data: flags }, { data: announcements }] = await Promise.all([
    admin.from("feature_flags").select("*").order("key"),
    admin.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  return ok({ flags: flags ?? [], announcements: announcements ?? [] });
});

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("flag"),
    key: z.string().regex(/^[a-z0-9_]{2,40}$/),
    enabled: z.boolean(),
    description: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("announce"),
    kind: z.enum(["announcement", "maintenance"]),
    body: z.string().trim().min(1).max(280),
  }),
  z.object({ action: z.literal("retire"), id: z.uuid() }),
]);

/** Feature flags, maintenance banner, announcement to all users. */
export const POST = handler(async (req) => {
  const a = await requireAdmin({ rate: 120 });
  const body = await parseJson(req, schema);
  const admin = supabaseAdmin();
  if (body.action === "flag") {
    await admin.from("feature_flags").upsert({
      key: body.key,
      enabled: body.enabled,
      description: body.description ?? null,
      updated_at: new Date().toISOString(),
    });
  } else if (body.action === "announce") {
    if (body.kind === "maintenance")
      await admin.from("announcements").update({ active: false }).eq("kind", "maintenance");
    await admin
      .from("announcements")
      .insert({ kind: body.kind, body: body.body, created_by: a.user.id });
  } else {
    await admin.from("announcements").update({ active: false }).eq("id", body.id);
  }
  await adminAudit(a.user.id, `settings_${body.action}`, {
    ...("key" in body ? { key: body.key, enabled: body.enabled } : {}),
    ...("kind" in body ? { kind: body.kind } : {}),
  });
  return ok({ ok: true });
});
