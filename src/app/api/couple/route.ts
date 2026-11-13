import { z } from "zod";
import { handler, ok, parseJson, requireCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  started_on: z.iso.date().nullable().optional(),
  ritual_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
});

/** ACC-06 relationship start date (drives the day counter and timeline) and ritual time. */
export const PATCH = handler(async (req) => {
  const { db, coupleId } = await requireCouple();
  const body = await parseJson(req, schema);
  if (body.started_on && body.started_on > new Date().toISOString().slice(0, 10))
    body.started_on = null;
  const { error } = await db.from("couples").update(body).eq("id", coupleId);
  if (error) throw error;
  if (body.started_on) {
    await supabaseAdmin().from("timeline_entries").upsert(
      {
        couple_id: coupleId,
        kind: "auto",
        title: "Where it started.",
        happened_on: body.started_on,
        source_key: "started",
      },
      { onConflict: "couple_id,source_key" },
    );
  }
  return ok({ ok: true });
});
