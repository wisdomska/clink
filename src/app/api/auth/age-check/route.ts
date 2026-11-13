import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { handler, ok, parseJson, rateLimit, clientIp, deny } from "@/lib/server/api";
import { dobSchema } from "@/lib/validation";
import { parseDob, isAdult, toIsoDate } from "@/lib/age";
import { sha256, sign } from "@/lib/server/crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";

const DEVICE = "clink_dev";
const AGE = "clink_age";

/**
 * ACC-02 age gate, run before an account exists. Under 18 blocks this device
 * and network for 24 h. 18+ gets a signed, 30-minute httpOnly cookie that the
 * auth callback turns into user_private.dob.
 */
export const POST = handler(async (req: NextRequest) => {
  const ip = clientIp(req);
  await rateLimit(`age:${ip}`, 20, 3600);
  const store = await cookies();
  let device = store.get(DEVICE)?.value;
  if (!device) {
    device = randomUUID();
    store.set(DEVICE, device, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const keys = [sha256(`ip:${ip}`), sha256(`dev:${device}`)];
  const admin = supabaseAdmin();
  const { data: blocks } = await admin
    .from("age_blocks")
    .select("blocked_until")
    .in("key_hash", keys)
    .gt("blocked_until", new Date().toISOString());
  if (blocks && blocks.length > 0) return ok({ ok: false, blocked: true });

  const body = await parseJson(req, dobSchema);
  const dob = parseDob(body);
  if (!dob) throw deny(422, "bad_date", "That date doesn't exist. Check the day and month.");
  if (!isAdult(dob)) {
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await admin.from("age_blocks").upsert(keys.map((key_hash) => ({ key_hash, blocked_until: until })));
    return ok({ ok: false, blocked: true });
  }
  const exp = Date.now() + 30 * 60 * 1000;
  store.set(AGE, sign(`${toIsoDate(dob)}|${exp}`, "age"), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  return ok({ ok: true });
});
