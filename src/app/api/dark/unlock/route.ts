import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyPin, PIN_MAX_TRIES, PIN_LOCK_MS } from "@/lib/server/pin";
import { setDarkSession } from "@/lib/server/dark";

/** DARK-01 PIN unlock: argon2id, 5 tries then a 15-minute lockout. */
export const POST = handler(async (req) => {
  const { user } = await requireCouple();
  await rateLimit(`dark-unlock:${user.id}`, 30, 900);
  const { pin } = await parseJson(req, z.object({ pin: z.string().regex(/^\d{4,8}$/) }));
  const admin = supabaseAdmin();
  const { data: s } = await admin
    .from("dark_settings")
    .select("pin_hash, pin_failed_count, pin_locked_until")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!s?.pin_hash) throw deny(409, "not_set_up", "Set up After Dark first.");
  if (s.pin_locked_until && new Date(s.pin_locked_until) > new Date()) {
    return ok({ ok: false, lockedUntil: s.pin_locked_until, triesLeft: 0 }, { status: 423 });
  }
  if (await verifyPin(pin, s.pin_hash)) {
    await admin
      .from("dark_settings")
      .update({ pin_failed_count: 0, pin_locked_until: null })
      .eq("user_id", user.id);
    await setDarkSession(user.id);
    await audit("dark_unlock", user.id, { method: "pin" });
    return ok({ ok: true });
  }
  const fails = (s.pin_failed_count ?? 0) + 1;
  const locked = fails >= PIN_MAX_TRIES ? new Date(Date.now() + PIN_LOCK_MS).toISOString() : null;
  await admin
    .from("dark_settings")
    .update({ pin_failed_count: locked ? 0 : fails, pin_locked_until: locked })
    .eq("user_id", user.id);
  await audit(locked ? "dark_lockout" : "dark_pin_wrong", user.id);
  return ok(
    { ok: false, triesLeft: locked ? 0 : PIN_MAX_TRIES - fails, lockedUntil: locked },
    { status: locked ? 423 : 401 },
  );
});
