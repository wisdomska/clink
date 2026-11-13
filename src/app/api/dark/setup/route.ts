import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/server/pin";
import { setDarkSession } from "@/lib/server/dark";
import { notify } from "@/lib/server/push";

const schema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, "PINs are 4 to 8 digits."),
  tiers: z
    .array(z.enum(["Flirty", "Steamy", "Spicy", "Unhinged"]))
    .max(4)
    .default(["Flirty"]),
});

/** Flow 10.3 steps 1-3: set an After Dark PIN and opt into tiers (Unhinged waits for age verification). */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`dark-setup:${user.id}`, 10, 3600);
  const body = await parseJson(req, schema);
  const admin = supabaseAdmin();
  const { data: priv } = await admin
    .from("user_private")
    .select("age_verified_at")
    .eq("user_id", user.id)
    .single();
  const tiers = body.tiers.filter((t) => t !== "Unhinged" || Boolean(priv?.age_verified_at));
  const { data: existing } = await admin
    .from("dark_settings")
    .select("opted_in_at")
    .eq("user_id", user.id)
    .maybeSingle();
  await admin.from("dark_settings").upsert({
    user_id: user.id,
    pin_hash: await hashPin(body.pin),
    pin_failed_count: 0,
    pin_locked_until: null,
    opted_tiers: tiers,
    opted_in_at: existing?.opted_in_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const { data: couple } = await admin
    .from("couples")
    .select("dark_opened_at")
    .eq("id", coupleId)
    .single();
  if (!couple?.dark_opened_at)
    await admin
      .from("couples")
      .update({ dark_opened_at: new Date().toISOString() })
      .eq("id", coupleId);
  await setDarkSession(user.id);
  await audit("dark_setup", user.id, { tiers: tiers.length });
  await notify(partnerId, "dark", { body: "" });
  return ok({ tiers });
});
