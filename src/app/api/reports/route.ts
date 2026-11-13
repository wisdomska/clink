import { z } from "zod";
import { handler, ok, parseJson, requireUser, activeCouple, rateLimit, clientIp, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { track } from "@/lib/server/analytics";

const schema = z.object({
  category: z.enum(["image_misuse", "harassment", "minor_safety", "broken", "other"]),
  details: z.string().trim().max(4000).optional(),
  attachmentPaths: z.array(z.string().regex(/^reports\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)).max(5).default([]),
  fromAfterDark: z.boolean().default(false),
});

/**
 * POST /api/reports: rate limited. SAF-10: anything involving a possible minor
 * suspends the reported account immediately and goes to the escalation path.
 * The partner is never told.
 */
export const POST = handler(async (req) => {
  const { user } = await requireUser();
  await rateLimit(`report:${user.id}`, 5, 3600);
  await rateLimit(`report-ip:${clientIp(req)}`, 20, 3600);
  const body = await parseJson(req, schema);
  const admin = supabaseAdmin();
  const couple = await activeCouple(user.id);
  const reported = body.category === "broken" ? null : (couple?.partnerId ?? null);
  const urgent = body.category === "minor_safety" || body.category === "image_misuse";
  const ownPaths = body.attachmentPaths.filter((p) => p.split("/")[1] === user.id);
  const { data: report, error } = await admin
    .from("reports")
    .insert({
      reporter_id: user.id,
      couple_id: couple?.coupleId ?? null,
      reported_user_id: reported,
      category: body.category,
      details: body.details ?? null,
      attachment_paths: ownPaths,
      from_after_dark: body.fromAfterDark,
      priority: urgent ? "urgent" : "normal",
      status: body.category === "minor_safety" ? "escalated" : "open",
    })
    .select("id")
    .single();
  if (error) throw error;
  if (body.category === "minor_safety" && reported) {
    await admin.from("profiles").update({ suspended_at: new Date().toISOString(), suspended_reason: "SAF-10 possible minor report, pending review" }).eq("id", reported);
    await admin.auth.admin.signOut(reported, "global").catch(() => undefined);
    await audit("saf10_suspension", reported, { report_id: report.id }, user.id);
  }
  await audit("report_submitted", user.id, { report_id: report.id, category: body.category });
  await track("report_submitted", user.id, { category: body.category });
  return ok({ id: report.id }, { status: 201 });
});
