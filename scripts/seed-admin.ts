/**
 * Grants is_admin to every account in ADMIN_EMAILS (comma separated).
 * This is the only way to become an admin. Run once per environment:
 *   pnpm seed:admin           (reads .env.local)
 * Admins must still enrol TOTP two-factor at /admin/mfa before any admin page opens.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!emails.length) throw new Error("ADMIN_EMAILS is empty");

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const found = new Map<string, string>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => u.email && found.set(u.email.toLowerCase(), u.id));
    if (data.users.length < 1000) break;
  }
  for (const email of emails) {
    let id = found.get(email);
    if (!id) {
      // Create the account (confirmed) so the admin can sign in by magic link straight away.
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (error) throw error;
      id = data.user.id;
      console.warn(`created ${email}`);
    }
    const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", id);
    if (error) throw error;
    await admin.from("audit_events").insert({ event: "admin.granted", user_id: id, meta: { via: "seed-admin" } });
    console.warn(`admin: ${email}`);
  }
}
main();
