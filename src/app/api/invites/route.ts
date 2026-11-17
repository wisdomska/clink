import { handler, ok, requireUser, deny, activeCouple, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inviteCode } from "@/lib/server/crypto";
import { isVerified } from "@/lib/server/verified";

/** POST /api/invites: caller not linked, verified, max 5 codes a day. Reuses a live code. */
export const POST = handler(async (req) => {
  const { user } = await requireUser({ full: true });
  if (!isVerified(user))
    throw deny(403, "unverified", "Confirm your email first, then you can link.");
  if (await activeCouple(user.id)) throw deny(409, "already_linked", "You're already linked.");
  const admin = supabaseAdmin();
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  if (!fresh) {
    const { data: live } = await admin
      .from("invites")
      .select("code, expires_at")
      .eq("inviter_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (live) return ok(live);
  }
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id)
    .gt("created_at", since);
  if ((count ?? 0) >= 5)
    throw deny(429, "too_many_codes", "That's 5 codes today. Try again tomorrow.");
  await rateLimit(`invite:${user.id}`, 10, 3600);
  // Retire older live codes so only one works at a time.
  await admin
    .from("invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("inviter_id", user.id)
    .is("used_at", null);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("invites")
      .insert({ code: inviteCode(), inviter_id: user.id })
      .select("code, expires_at")
      .single();
    if (!error && data) {
      await audit("invite_created", user.id);
      return ok(data, { status: 201 });
    }
    if (error && error.code !== "23505") throw error;
  }
  throw deny(500, "code_collision", "Couldn't make a code. Try again.");
});
