import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";

const schema = z.object({
  status: z.enum(["open", "triage", "assigned", "resolved", "escalated"]).optional(),
  assignToMe: z.boolean().optional(),
  resolution: z.string().trim().max(2000).optional(),
});

/** Triage, assign, resolve, escalate. */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const a = await requireAdmin({ rate: 300 });
  const body = await parseJson(req, schema);
  const patch: { status?: "open" | "triage" | "assigned" | "resolved" | "escalated"; assigned_to?: string; resolution?: string } = {};
  if (body.status) patch.status = body.status;
  if (body.assignToMe) {
    patch.assigned_to = a.user.id;
    if (!body.status) patch.status = "assigned";
  }
  if (body.resolution !== undefined) patch.resolution = body.resolution;
  const { data, error } = await supabaseAdmin().from("reports").update(patch).eq("id", id).select("id, category").maybeSingle();
  if (error || !data) throw deny(404, "not_found", "No such report.");
  await adminAudit(a.user.id, "report_updated", { report: id, ...body, resolution: body.resolution ? "set" : null });
  return ok({ ok: true });
});
