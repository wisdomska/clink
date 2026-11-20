import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { weeklyDigest } from "@/lib/server/digest";

/** Whether you get the weekly health email. */
export const GET = handler(async () => {
  const { account } = await requireAdmin();
  const { data } = await supabaseAdmin()
    .from("admin_accounts")
    .select("weekly_email, email")
    .eq("id", account.id)
    .single();
  return ok({ weekly: Boolean(data?.weekly_email), email: data?.email ?? null });
});

/** Turn the Monday email on or off. */
export const PATCH = handler(async (req) => {
  const { account, user } = await requireAdmin();
  const { weekly } = await parseJson(req, z.object({ weekly: z.boolean() }));
  await supabaseAdmin()
    .from("admin_accounts")
    .update({ weekly_email: weekly })
    .eq("id", account.id);
  await adminAudit(user.id, "weekly_email", { on: weekly });
  return ok({ weekly });
});

/** Send this week's summary to you now. */
export const POST = handler(async () => {
  const { account } = await requireAdmin({ rate: 10 });
  const r = await weeklyDigest({ only: account.id });
  if (!("sent" in r) || !r.sent)
    throw deny(503, "mail_off", "Email isn't set up yet, so nothing was sent.");
  return ok({ sent: r.sent });
});
