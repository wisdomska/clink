import "server-only";
import { deny, rateLimit, audit } from "@/lib/server/api";
import { currentAdmin } from "@/lib/server/admin-auth";
import type { Json } from "@/types/database";

/**
 * Every admin route and API goes through here: a signed-in admin portal
 * session (separate from any Clink user session). A temporary password must
 * be replaced before anything else works. Admin rate limits are separate.
 */
export async function requireAdmin(opts: { rate?: number; allowMustChange?: boolean } = {}) {
  const account = await currentAdmin();
  if (!account) throw deny(401, "admin_signed_out", "Sign in to the admin portal.");
  if (account.must_change_password && !opts.allowMustChange)
    throw deny(403, "admin_must_change", "Set your own password first.");
  await rateLimit(`admin:${account.id}`, opts.rate ?? 600, 3600);
  // Audit rows name the linked Clink user when there is one.
  return { user: { id: account.user_id }, account, name: account.name || account.email };
}

export async function adminAudit(
  adminId: string | null,
  event: string,
  meta: Record<string, Json> = {},
  subjectUserId: string | null = null,
) {
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
