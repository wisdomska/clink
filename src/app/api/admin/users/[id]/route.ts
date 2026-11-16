import { z } from "zod";
import { handler, ok, parseJson, deny, activeCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit, revokeUserSessions } from "@/lib/server/admin";
import { isUuid } from "@/lib/server/admin-list";
import { endCouple } from "@/lib/server/wipe";
import { hardDeleteUser } from "@/lib/server/jobs";

const schema = z.object({
  action: z.enum([
    "suspend",
    "unsuspend",
    "force_unlink",
    "delete",
    // Support tools.
    "resend_link",
    "clear_dark_lockout",
    "sign_out_all",
  ]),
  reason: z.string().trim().max(300).optional(),
});

const SUPPORT = new Set(["resend_link", "clear_dark_lockout", "sign_out_all"]);

/** Ends every session; falls back to the auth admin API if the helper isn't there yet. */
async function signOutEverywhere(id: string) {
  await revokeUserSessions(id).catch(() =>
    supabaseAdmin()
      .auth.admin.signOut(id, "global")
      .catch(() => undefined),
  );
}

/**
 * Suspend, unsuspend, force unlink (with verified wipe) or delete, plus support
 * tools: resend a sign-in link, clear an After Dark PIN lockout, sign out of
 * every device. Every action is audited; support tools need a reason.
 */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw deny(404, "not_found", "No such user.");
  const a = await requireAdmin({ rate: 120 });
  const { action, reason } = await parseJson(req, schema);
  if (id === a.user.id && action !== "unsuspend" && !SUPPORT.has(action))
    throw deny(409, "self", "You can't do that to your own account.");
  if (SUPPORT.has(action) && (reason ?? "").length < 3)
    throw deny(422, "reason_required", "Add a short reason. It goes in the audit log.");
  const admin = supabaseAdmin();
  const { data: target } = await admin
    .from("profiles")
    .select("id, is_admin")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw deny(404, "not_found", "No such user.");
  if (action === "suspend") {
    await admin
      .from("profiles")
      .update({
        suspended_at: new Date().toISOString(),
        suspended_reason: reason ?? "Suspended by the safety team",
      })
      .eq("id", id);
    await signOutEverywhere(id);
  } else if (action === "unsuspend") {
    await admin
      .from("profiles")
      .update({ suspended_at: null, suspended_reason: null })
      .eq("id", id);
  } else if (action === "force_unlink") {
    const c = await activeCouple(id);
    if (!c) throw deny(409, "not_linked", "Not linked.");
    await endCouple(c.coupleId, "admin_unlink", a.user.id);
  } else if (action === "resend_link") {
    const { data: u } = await admin.auth.admin.getUserById(id);
    if (!u?.user?.email) throw deny(409, "no_email", "This account has no email address.");
    const redirect = new URL("/auth/callback", req.nextUrl.origin).toString();
    // The service client sends the same magic-link email the sign-in screen does.
    const { error } = await admin.auth.signInWithOtp({
      email: u.user.email,
      options: { shouldCreateUser: false, emailRedirectTo: redirect },
    });
    if (error)
      throw deny(
        error.status === 429 ? 429 : 502,
        "email_failed",
        error.status === 429
          ? "Too many emails to this address just now. Try again in a minute."
          : "Couldn't send the email. Try again in a moment.",
      );
  } else if (action === "clear_dark_lockout") {
    const { data: s } = await admin
      .from("dark_settings")
      .update({ pin_failed_count: 0, pin_locked_until: null })
      .eq("user_id", id)
      .select("user_id")
      .maybeSingle();
    if (!s) throw deny(409, "not_set_up", "This person hasn't set up After Dark.");
  } else if (action === "sign_out_all") {
    const n = await revokeUserSessions(id).catch(() => {
      throw deny(500, "revoke_failed", "Couldn't sign them out. Try again.");
    });
    await adminAudit(a.user.id, action, { reason: reason ?? null, sessions: n }, id);
    return ok({ ok: true, sessions: n });
  } else {
    const c = await activeCouple(id);
    if (c) await endCouple(c.coupleId, "delete_account", a.user.id);
    await admin
      .from("deletion_requests")
      .upsert({ user_id: id, execute_after: new Date().toISOString() });
    await admin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), display_name: null, phone: null })
      .eq("id", id);
    await signOutEverywhere(id);
    // An admin delete happens now, not at the next scheduled run.
    await adminAudit(a.user.id, action, { reason: reason ?? null }, id);
    await hardDeleteUser(id);
    return ok({ ok: true, deleted: true });
  }
  await adminAudit(a.user.id, action, { reason: reason ?? null }, id);
  return ok({ ok: true });
});
