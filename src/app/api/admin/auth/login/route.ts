import { z } from "zod";
import { headers } from "next/headers";
import { handler, ok, parseJson, rateLimit, deny, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startAdminSession, verifyPassword } from "@/lib/server/admin-auth";

/** Admin portal sign-in. Separate from Clink accounts. 5 tries, then 15 minutes. */
export const POST = handler(async (req) => {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  await rateLimit(`admin-login-ip:${ip}`, 30, 3600);
  const { email, password } = await parseJson(
    req,
    z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) }),
  );
  const db = supabaseAdmin();
  const { data: a } = await db
    .from("admin_accounts")
    .select(
      "id, password_hash, session_version, must_change_password, failed_logins, locked_until, user_id",
    )
    .eq("email", email)
    .maybeSingle();
  const wrong = () => deny(401, "bad_login", "That email and password don't match.");
  if (!a) {
    // Same work either way, so timing doesn't reveal which emails exist.
    await verifyPassword(
      password,
      "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    throw wrong();
  }
  if (a.locked_until && new Date(a.locked_until) > new Date())
    throw deny(429, "locked", "Too many tries. Wait 15 minutes, then try again.");
  if (!(await verifyPassword(password, a.password_hash))) {
    const n = a.failed_logins + 1;
    await db
      .from("admin_accounts")
      .update({
        failed_logins: n >= 5 ? 0 : n,
        locked_until: n >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
      })
      .eq("id", a.id);
    await audit("admin.login_failed", null, { ip }, a.user_id);
    throw wrong();
  }
  await db
    .from("admin_accounts")
    .update({ failed_logins: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", a.id);
  await startAdminSession(a);
  await audit("admin.login", null, { ip }, a.user_id);
  return ok({ mustChange: a.must_change_password });
});
