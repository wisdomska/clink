import type { NextRequest } from "next/server";
import { handler, ok, parseJson, requireUser, deny, clientIp, rateLimit, audit } from "@/lib/server/api";
import { dobSchema } from "@/lib/validation";
import { parseDob, isAdult, toIsoDate } from "@/lib/age";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/server/crypto";

/**
 * DOB for accounts created without the pre-signup gate (Google, passkey).
 * Under 18: the fresh account is removed and the network is blocked for 24 h.
 */
export const POST = handler(async (req: NextRequest) => {
  const { user, db } = await requireUser();
  await rateLimit(`dob:${user.id}`, 5, 3600);
  const dob = parseDob(await parseJson(req, dobSchema));
  if (!dob) throw deny(422, "bad_date", "That date doesn't exist. Check the day and month.");
  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("user_private").select("user_id").eq("user_id", user.id).maybeSingle();
  if (existing) throw deny(409, "already_set", "Your date of birth is already saved.");
  if (!isAdult(dob)) {
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await admin.from("age_blocks").upsert([{ key_hash: sha256(`ip:${clientIp(req)}`), blocked_until: until }]);
    await audit("age_blocked", null, {});
    await db.auth.signOut();
    await admin.auth.admin.deleteUser(user.id);
    return ok({ ok: false, blocked: true });
  }
  await admin.from("user_private").insert({ user_id: user.id, dob: toIsoDate(dob) });
  return ok({ ok: true });
});
