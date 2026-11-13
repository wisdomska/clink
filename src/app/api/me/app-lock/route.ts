import { z } from "zod";
import { handler, ok, parseJson, requireUser, deny, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashPin, verifyPin, PIN_MAX_TRIES, PIN_LOCK_MS } from "@/lib/server/pin";
import { clearAppUnlocked, setAppUnlocked, signedInRecently } from "@/lib/server/app-lock";

const pin = z.string().regex(/^\d{4,8}$/, "Use 4 to 8 digits.");
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set"), pin, current: z.string().optional() }),
  z.object({ action: z.literal("clear"), pin }),
  z.object({ action: z.literal("unlock"), pin }),
  z.object({ action: z.literal("lock") }),
  z.object({ action: z.literal("reset") }),
]);

/** CHAT-07: turn the app-open PIN on or off, unlock, or relock. */
export const POST = handler(async (req) => {
  const { user } = await requireUser();
  await rateLimit(`app-lock:${user.id}`, 40, 900);
  const body = await parseJson(req, schema);
  if (body.action === "lock") {
    await clearAppUnlocked();
    return ok({ ok: true });
  }
  const admin = supabaseAdmin();
  if (body.action === "reset") {
    // Forgotten PIN: allowed only within 10 minutes of a fresh sign-in.
    if (!signedInRecently(user.last_sign_in_at))
      throw deny(403, "stale", "Sign out and back in first, then turn the PIN off.");
    await admin
      .from("user_private")
      .update({ app_pin_hash: null, app_pin_failed_count: 0, app_pin_locked_until: null })
      .eq("user_id", user.id);
    await audit("app_pin_reset", user.id);
    return ok({ ok: true });
  }
  const { data: s } = await admin
    .from("user_private")
    .select("app_pin_hash, app_pin_failed_count, app_pin_locked_until")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!s) throw deny(409, "not_ready", "Finish setting up your account first.");

  const check = async (candidate: string) => {
    if (!s.app_pin_hash) return true;
    if (s.app_pin_locked_until && new Date(s.app_pin_locked_until) > new Date())
      throw deny(423, "locked", "Too many tries. Wait 15 minutes, or sign out and back in.");
    if (await verifyPin(candidate, s.app_pin_hash)) {
      if (s.app_pin_failed_count)
        await admin
          .from("user_private")
          .update({ app_pin_failed_count: 0, app_pin_locked_until: null })
          .eq("user_id", user.id);
      return true;
    }
    const fails = s.app_pin_failed_count + 1;
    const locked = fails >= PIN_MAX_TRIES ? new Date(Date.now() + PIN_LOCK_MS).toISOString() : null;
    await admin
      .from("user_private")
      .update({ app_pin_failed_count: locked ? 0 : fails, app_pin_locked_until: locked })
      .eq("user_id", user.id);
    await audit(locked ? "app_pin_lockout" : "app_pin_wrong", user.id);
    if (locked)
      throw deny(423, "locked", "Too many tries. Wait 15 minutes, or sign out and back in.");
    throw deny(401, "wrong_pin", `That's not it. ${PIN_MAX_TRIES - fails} tries left.`);
  };

  if (body.action === "unlock") {
    if (!s.app_pin_hash) return ok({ ok: true });
    await check(body.pin);
    await setAppUnlocked(user.id);
    return ok({ ok: true });
  }
  if (body.action === "set") {
    if (s.app_pin_hash) await check(body.current ?? "");
    await admin
      .from("user_private")
      .update({ app_pin_hash: await hashPin(body.pin), app_pin_failed_count: 0 })
      .eq("user_id", user.id);
    await setAppUnlocked(user.id);
    await audit("app_pin_set", user.id);
    return ok({ ok: true });
  }
  await check(body.pin);
  await admin
    .from("user_private")
    .update({ app_pin_hash: null, app_pin_failed_count: 0, app_pin_locked_until: null })
    .eq("user_id", user.id);
  await clearAppUnlocked();
  await audit("app_pin_cleared", user.id);
  return ok({ ok: true });
});
