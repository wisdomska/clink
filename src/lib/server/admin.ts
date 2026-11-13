import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deny, rateLimit, audit } from "@/lib/server/api";
import type { Json } from "@/types/database";

/**
 * Every admin route and API goes through here: signed in, is_admin in the
 * database, and a TOTP-verified session (aal2). Admin rate limits are separate.
 */
export async function requireAdmin(opts: { rate?: number } = {}) {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw deny(404, "not_found", "Not found.");
  const { data: p } = await supabaseAdmin().from("profiles").select("is_admin, display_name").eq("id", user.id).single();
  if (!p?.is_admin) throw deny(404, "not_found", "Not found.");
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") throw deny(401, "mfa_required", "Two-factor verification required.");
  await rateLimit(`admin:${user.id}`, opts.rate ?? 600, 3600);
  return { user, name: p.display_name ?? user.email ?? "admin" };
}

export async function adminAudit(adminId: string, event: string, meta: Record<string, Json> = {}, subjectUserId: string | null = null) {
  await audit(`admin.${event}`, subjectUserId, meta, adminId);
}

/** Free-tier limits the dashboard warns against (70% and 90%). See docs/LIMITS.md. */
export const FREE_LIMITS = {
  db_bytes: 500 * 1024 * 1024,
  supabase_storage_bytes: 1024 * 1024 * 1024,
  r2_storage_bytes: 10 * 1024 * 1024 * 1024,
  realtime_connections: 200,
  egress_bytes_month: 5 * 1024 * 1024 * 1024,
};
