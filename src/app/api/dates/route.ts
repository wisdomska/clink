import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/server/push";

const schema = z.object({ kitId: z.uuid(), startAt: z.iso.datetime({ offset: true }) });

/** DATE-02: schedule a kit. Reminders go out 1 day and 1 hour before, in each partner's own time. */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`date:${user.id}`, 30, 3600);
  const { kitId, startAt } = await parseJson(req, schema);
  if (new Date(startAt).getTime() < Date.now() - 60_000)
    throw deny(422, "past", "Pick a time in the future.");
  const admin = supabaseAdmin();
  const { data: kit } = await admin
    .from("date_kits")
    .select("id, title")
    .eq("id", kitId)
    .eq("enabled", true)
    .maybeSingle();
  if (!kit) throw deny(404, "no_kit", "That kit isn't available.");
  const { data, error } = await admin
    .from("scheduled_dates")
    .insert({ couple_id: coupleId, kit_id: kitId, start_at: startAt, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;
  const { data: me } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  await notify(partnerId, "dates", {
    body: `${me?.display_name ?? "Your person"} booked ${kit.title}. Check the stub.`,
    url: "/plans",
  });
  return ok({ id: data.id }, { status: 201 });
});
