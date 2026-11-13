import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Uncork: records the first opening once the date has passed. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("capsules").select("couple_id, unlock_at, opened_at, title").eq("id", id).maybeSingle();
  if (!c || c.couple_id !== coupleId) throw deny(404, "not_found", "Not found.");
  if (new Date(c.unlock_at) > new Date()) throw deny(423, "locked", "Not yet.");
  if (!c.opened_at) {
    await admin.from("capsules").update({ opened_at: new Date().toISOString() }).eq("id", id);
    await admin.from("timeline_entries").upsert({ couple_id: coupleId, kind: "auto", title: `Uncorked: ${c.title}`, happened_on: new Date().toISOString().slice(0, 10), source_key: `uncork:${id}` }, { onConflict: "couple_id,source_key" });
  }
  return ok({ ok: true });
});
