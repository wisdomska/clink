import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { isUuid } from "@/lib/server/admin-list";

const schema = z.object({
  status: z.enum(["open", "triage", "assigned", "resolved", "escalated"]).optional(),
  assignToMe: z.boolean().optional(),
  unassign: z.boolean().optional(),
  resolution: z.string().trim().max(2000).optional(),
});

const STATUS_COPY: Record<string, string> = {
  open: "Moved back to open",
  triage: "Moved to triage",
  assigned: "Marked as assigned",
  escalated: "Escalated",
  resolved: "Resolved",
};

type Loose = {
  from: (t: string) => {
    update: (v: Record<string, unknown>) => {
      eq: (
        c: string,
        v: string,
      ) => {
        select: (c: string) => {
          maybeSingle: () => PromiseLike<{
            data: { id: string; category: string } | null;
            error: unknown;
          }>;
        };
      };
    };
    insert: (v: Record<string, unknown>[]) => PromiseLike<{ error: unknown }>;
  };
};

/** Triage, assign, resolve, escalate. Status changes and assignments go in the report's history. */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw deny(404, "not_found", "No such report.");
  const a = await requireAdmin({ rate: 300 });
  const body = await parseJson(req, schema);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (body.status) {
    patch.status = body.status;
    patch.status_changed_at = now;
  }
  if (body.assignToMe) {
    patch.assigned_admin_id = a.account.id;
    patch.assigned_at = now;
    if (a.user.id) patch.assigned_to = a.user.id;
    if (!body.status) {
      patch.status = "assigned";
      patch.status_changed_at = now;
    }
  } else if (body.unassign) {
    patch.assigned_admin_id = null;
    patch.assigned_at = null;
    patch.assigned_to = null;
  }
  if (body.resolution !== undefined) patch.resolution = body.resolution;
  if (!Object.keys(patch).length) throw deny(422, "invalid", "Nothing to change.");
  const db = supabaseAdmin() as unknown as Loose;
  const { data, error } = await db
    .from("reports")
    .update(patch)
    .eq("id", id)
    .select("id, category")
    .maybeSingle();
  if (error || !data) throw deny(404, "not_found", "No such report.");

  const history: Record<string, unknown>[] = [];
  if (body.assignToMe)
    history.push({
      report_id: id,
      admin_id: a.account.id,
      kind: "assign",
      body: `Assigned to ${a.name}`,
    });
  if (body.unassign)
    history.push({ report_id: id, admin_id: a.account.id, kind: "assign", body: "Unassigned" });
  if (typeof patch.status === "string")
    history.push({
      report_id: id,
      admin_id: a.account.id,
      kind: "status",
      body: STATUS_COPY[patch.status] ?? patch.status,
    });
  if (history.length) await db.from("report_notes").insert(history);

  await adminAudit(a.user.id, "report_updated", {
    report: id,
    ...body,
    resolution: body.resolution ? "set" : null,
  });
  return ok({ ok: true });
});
