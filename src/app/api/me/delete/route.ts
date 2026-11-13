import { z } from "zod";
import { handler, ok, parseJson, requireUser, activeCouple, audit, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { endCouple } from "@/lib/server/wipe";
import { clearDarkSession } from "@/lib/server/dark";
import { notify } from "@/lib/server/push";

/**
 * ACC-08: delete my account. Unlinks and wipes sensitive media now (SAF-05),
 * removes my shared non-vault media from the partner's side now, signs out
 * everywhere, and the daily job hard-deletes everything else within 30 days.
 */
export const POST = handler(async (req) => {
  const { user, db } = await requireUser();
  await rateLimit(`delete:${user.id}`, 3, 3600);
  const { confirm } = await parseJson(req, z.object({ confirm: z.literal("DELETE") }).catch({ confirm: "x" as "DELETE" }));
  if (confirm !== "DELETE") throw deny(422, "confirm", "Type DELETE to confirm.");
  const admin = supabaseAdmin();
  const couple = await activeCouple(user.id);
  if (couple) {
    await endCouple(couple.coupleId, "delete_account", user.id);
    await notify(couple.partnerId, "clinks", { body: "Your Clink link has ended.", url: "/link" });
  }
  await admin.from("deletion_requests").upsert({ user_id: user.id });
  await admin.from("profiles").update({ deleted_at: new Date().toISOString(), display_name: null, phone: null }).eq("id", user.id);
  await audit("account_deletion_requested", user.id);
  await clearDarkSession();
  await db.auth.signOut({ scope: "global" });
  return ok({ ok: true });
});
