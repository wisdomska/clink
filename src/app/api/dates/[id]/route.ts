import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { track } from "@/lib/server/analytics";

const schema = z.object({ status: z.enum(["in_progress", "completed", "cancelled"]) });

/** Start, complete (tear the stub) or cancel a scheduled date. Completing adds it to the timeline. */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  const { status } = await parseJson(req, schema);
  const admin = supabaseAdmin();
  const { data: d } = await admin.from("scheduled_dates").select("id, couple_id, status, start_at, date_kits(title)").eq("id", id).maybeSingle();
  if (!d || d.couple_id !== coupleId) throw deny(404, "not_found", "Not found.");
  if (d.status === "completed" || d.status === "cancelled") throw deny(409, "done", "That date is already done.");
  const now = new Date().toISOString();
  await admin.from("scheduled_dates").update({ status, completed_at: status === "completed" ? now : null }).eq("id", id);
  if (status === "completed") {
    const title = (d.date_kits as unknown as { title: string } | null)?.title ?? "Date night";
    await admin.from("timeline_entries").upsert(
      { couple_id: coupleId, kind: "auto", title: `Date night: ${title}`, happened_on: now.slice(0, 10), source_key: `date:${id}` },
      { onConflict: "couple_id,source_key" },
    );
    await track("activity_completed", user.id, { type: "date", mode: "live" }, coupleId);
  }
  return ok({ ok: true });
});
