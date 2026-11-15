import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { hashPassword, startAdminSession, verifyPassword } from "@/lib/server/admin-auth";

const PASSWORD = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(200)
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add a capital letter.")
  .regex(/[0-9]/, "Add a number.");

/** Your admin login: who you are. */
export const GET = handler(async () => {
  const { account } = await requireAdmin({ allowMustChange: true });
  return ok({ email: account.email, name: account.name, mustChange: account.must_change_password });
});

/** Change your admin email, name or password. Needs your current password. */
export const PATCH = handler(async (req) => {
  const { account } = await requireAdmin({ allowMustChange: true, rate: 60 });
  const body = await parseJson(
    req,
    z.object({
      current: z.string().max(200),
      email: z.email().trim().toLowerCase().optional(),
      name: z.string().trim().min(1).max(60).optional(),
      password: PASSWORD.optional(),
    }),
  );
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("admin_accounts")
    .select("password_hash, session_version")
    .eq("id", account.id)
    .single();
  if (!row || !(await verifyPassword(body.current, row.password_hash)))
    throw deny(403, "bad_password", "Your current password isn't right.");
  if (account.must_change_password && !body.password)
    throw deny(422, "must_change", "Choose a new password.");
  const patch: {
    updated_at: string;
    email?: string;
    name?: string;
    password_hash?: string;
    must_change_password?: boolean;
    session_version?: number;
  } = { updated_at: new Date().toISOString() };
  if (body.email && body.email !== account.email) {
    const { data: taken } = await db
      .from("admin_accounts")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();
    if (taken) throw deny(409, "taken", "Another admin already uses that email.");
    patch.email = body.email;
  }
  if (body.name) patch.name = body.name;
  if (body.password) {
    if (await verifyPassword(body.password, row.password_hash))
      throw deny(422, "same", "That's the password you have now. Pick a new one.");
    patch.password_hash = await hashPassword(body.password);
    patch.must_change_password = false;
    // Every other admin session ends; this one carries on.
    patch.session_version = row.session_version + 1;
  }
  const { error } = await db.from("admin_accounts").update(patch).eq("id", account.id);
  if (error) throw error;
  if (patch.session_version)
    await startAdminSession({ id: account.id, session_version: patch.session_version });
  await adminAudit(account.user_id, "account_updated", {
    email: Boolean(patch.email),
    password: Boolean(body.password),
  });
  return ok({ ok: true });
});
