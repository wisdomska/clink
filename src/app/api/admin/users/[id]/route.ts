import { z } from "zod";
import { handler, ok, parseJson, deny, activeCouple } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { endCouple } from "@/lib/server/wipe";

const schema = z.object({
  action: z.enum(["suspend", "unsuspend", "force_unlink", "delete"]),
  reason: z.string().trim().max(300).optional(),
});

/** Suspend, unsuspend, force unlink (with verified wipe) or delete. Every action is audited. */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const a = await requireAdmin({ rate: 120 });
  const { action, reason } = await parseJson(req, schema);
  if (id === a.user.id && action !== "unsuspend")
    throw deny(409, "self", "You can't do that to your own account.");
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
    await admin.auth.admin.signOut(id, "global").catch(() => undefined);
  } else if (action === "unsuspend") {
    await admin
      .from("profiles")
      .update({ suspended_at: null, suspended_reason: null })
      .eq("id", id);
  } else if (action === "force_unlink") {
    const c = await activeCouple(id);
    if (!c) throw deny(409, "not_linked", "Not linked.");
    await endCouple(c.coupleId, "admin_unlink", a.user.id);
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
    await admin.auth.admin.signOut(id, "global").catch(() => undefined);
  }
  await adminAudit(a.user.id, action, { reason: reason ?? null }, id);
  return ok({ ok: true });
});
