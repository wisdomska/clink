import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { localParts } from "@/lib/time";

/** DATE-04: start a 7- or 30-day challenge. One active challenge at a time. */
export const POST = handler(async (req) => {
  const { user, coupleId } = await requireCouple();
  const { templateId } = await parseJson(req, z.object({ templateId: z.uuid() }));
  const admin = supabaseAdmin();
  const { data: t } = await admin
    .from("challenge_templates")
    .select("id, days")
    .eq("id", templateId)
    .eq("enabled", true)
    .maybeSingle();
  if (!t) throw deny(404, "no_template", "That challenge isn't available.");
  await admin
    .from("challenges")
    .update({ status: "abandoned" })
    .eq("couple_id", coupleId)
    .eq("status", "active");
  const { data: me } = await admin.from("profiles").select("timezone").eq("id", user.id).single();
  const start = localParts(new Date(), me?.timezone ?? "UTC").dateKey;
  const { data: c, error } = await admin
    .from("challenges")
    .insert({ couple_id: coupleId, template_id: t.id, start_on: start, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;
  await admin.from("challenge_days").insert(
    Array.from({ length: t.days }, (_, i) => ({
      challenge_id: c.id,
      couple_id: coupleId,
      day: i + 1,
    })),
  );
  return ok({ id: c.id }, { status: 201 });
});
