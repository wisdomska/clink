import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { storage } from "@/lib/storage";
import { EXPORT_MAX, csvResponse, isUuid, paging } from "@/lib/server/admin-list";

const SORTS = ["priority", "created", "updated", "status", "category"] as const;
const STATUSES = ["open", "triage", "assigned", "escalated", "resolved"];
const CATEGORIES = ["image_misuse", "harassment", "minor_safety", "broken", "other"];
const COLUMN: Record<(typeof SORTS)[number], string> = {
  priority: "priority",
  created: "created_at",
  updated: "updated_at",
  status: "status",
  category: "category",
};

interface ReportRow {
  id: string;
  reporter_id: string | null;
  reported_user_id: string | null;
  category: string;
  details: string | null;
  attachment_paths: string[];
  from_after_dark: boolean;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_admin_id: string | null;
  assigned_at: string | null;
  status_changed_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}
interface Q extends PromiseLike<{
  data: ReportRow[] | null;
  error: unknown;
  count: number | null;
}> {
  order: (c: string, o: { ascending: boolean }) => Q;
  range: (a: number, b: number) => Q;
  eq: (c: string, v: string) => Q;
  neq: (c: string, v: string) => Q;
}

/**
 * Reports queue with filters (status, category, urgency, assignee), sorting and
 * pages. The only content visible is what the reporter chose to attach.
 */
export const GET = handler(async (req: NextRequest) => {
  const a = await requireAdmin();
  const p = req.nextUrl.searchParams;
  const pg = paging(p, { sorts: SORTS, sort: "priority", dir: "desc" });
  // New triage columns aren't in the generated types yet, so the builder is loosely typed.
  const db = supabaseAdmin() as unknown as {
    from: (t: string) => { select: (c: string, o?: { count: "exact" }) => Q };
  };
  let q = db
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, category, details, attachment_paths, from_after_dark, status, priority, assigned_to, assigned_admin_id, assigned_at, status_changed_at, resolution, created_at, updated_at",
      { count: "exact" },
    )
    .order(COLUMN[pg.sort], { ascending: pg.dir === "asc" });
  // Stable order: newest first within a tie, then by id.
  if (pg.sort !== "created") q = q.order("created_at", { ascending: false });
  q = q.order("id", { ascending: true });

  const status = p.get("status");
  if (status === "active") q = q.neq("status", "resolved");
  else if (status && STATUSES.includes(status)) q = q.eq("status", status);
  const category = p.get("category");
  if (category && CATEGORIES.includes(category)) q = q.eq("category", category);
  const urgency = p.get("urgency");
  if (urgency === "urgent" || urgency === "normal") q = q.eq("priority", urgency);
  if (p.get("assigned") === "me") q = q.eq("assigned_admin_id", a.account.id);
  const id = p.get("id");
  if (isUuid(id)) q = q.eq("id", id);

  q = pg.csv ? q.range(0, EXPORT_MAX - 1) : q.range(pg.from, pg.to);
  const { data, error, count } = await q;
  if (error) throw error;
  const rows = data ?? [];

  const adminIds = [...new Set(rows.map((r) => r.assigned_admin_id).filter(isUuid))];
  const { data: admins } = adminIds.length
    ? await supabaseAdmin().from("admin_accounts").select("id, name, email").in("id", adminIds)
    : { data: [] as Array<{ id: string; name: string; email: string }> };
  const nameOf = new Map(
    (admins ?? []).map((x) => [x.id, x.name && x.name !== "Admin" ? x.name : x.email]),
  );

  if (pg.csv) {
    await adminAudit(a.user.id, "export", {
      table: "reports",
      rows: rows.length,
      filters: { status, category, urgency },
    });
    return csvResponse(
      "clink-reports",
      rows.map((r) => ({
        id: r.id,
        created: r.created_at,
        category: r.category,
        urgency: r.priority,
        status: r.status,
        status_changed: r.status_changed_at ?? "",
        assigned_to: r.assigned_admin_id ? (nameOf.get(r.assigned_admin_id) ?? "") : "",
        after_dark: r.from_after_dark ? "yes" : "",
        reported_user: r.reported_user_id ?? "",
        reporter: r.reporter_id ?? "",
        details: r.details ?? "",
        resolution: r.resolution ?? "",
      })),
    );
  }

  const s = await storage();
  const reports = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      assigned_admin_name: r.assigned_admin_id ? (nameOf.get(r.assigned_admin_id) ?? null) : null,
      assigned_to_me: r.assigned_admin_id === a.account.id,
      attachments: await Promise.all(
        r.attachment_paths.map((path) => s.presignRead("media", path, 600).catch(() => null)),
      ),
    })),
  );
  return ok({
    reports,
    total: count ?? reports.length,
    page: pg.page,
    size: pg.size,
    sort: pg.sort,
    dir: pg.dir,
  });
});
