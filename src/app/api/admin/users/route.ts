import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { EXPORT_MAX, csvResponse, isDay, paging } from "@/lib/server/admin-list";

const SORTS = ["joined", "email", "name", "last_sign_in"] as const;
const STATUSES = ["active", "suspended", "deleting", "unconfirmed"] as const;
type Status = (typeof STATUSES)[number];

type Row = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  display_name: string | null;
  home_city: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  deleted_at: string | null;
  is_admin: boolean;
  couple_id: string | null;
  linked_at: string | null;
  status: Status;
  total: number;
};

/**
 * Users and couples: search (email or name), filters, sorting and pages.
 * Account status only, never content. ?format=csv exports the whole filtered set.
 * The database does the searching, sorting, counting and paging
 * (svc_admin_users), so only the page you're looking at is loaded.
 */
export const GET = handler(async (req: NextRequest) => {
  const a = await requireAdmin();
  const p = req.nextUrl.searchParams;
  const pg = paging(p, { sorts: SORTS, sort: "joined", dir: "desc" });
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const status = STATUSES.includes(p.get("status") as Status) ? (p.get("status") as Status) : null;
  const linked =
    p.get("linked") === "linked" || p.get("linked") === "unlinked" ? p.get("linked") : null;
  const from = isDay(p.get("from")) ? p.get("from")! : null;
  const to = isDay(p.get("to")) ? p.get("to")! : null;
  const admin = supabaseAdmin();

  const query = (limit: number, offset: number) =>
    admin.rpc("svc_admin_users", {
      p_q: q,
      p_status: status as string,
      p_linked: linked as string,
      p_from: from as string,
      p_to: to as string,
      p_sort: pg.sort,
      p_dir: pg.dir,
      p_limit: limit,
      p_offset: offset,
    });
  const { data, error } = pg.csv
    ? await query(EXPORT_MAX, 0)
    : await query(pg.to - pg.from + 1, pg.from);
  if (error) throw error;
  const slice = (data ?? []) as unknown as Row[];
  let total = slice[0] ? Number(slice[0].total) : 0;
  // Past the last page: still report how many there are.
  if (!slice.length && pg.from > 0 && !pg.csv) {
    const { data: one } = await query(1, 0);
    total = one?.[0] ? Number((one[0] as unknown as Row).total) : 0;
  }

  const ageVerified = new Set<string>();
  const dobs = new Map<string, string>();
  const seen = new Map<string, string>();
  const deletesAt = new Map<string, string>();
  for (let i = 0; i < slice.length; i += 200) {
    const ids = slice.slice(i, i + 200).map((u) => u.id);
    const [{ data: priv }, { data: pres }, { data: dels }] = await Promise.all([
      admin.from("user_private").select("user_id, dob, age_verified_at").in("user_id", ids),
      admin.from("presence").select("user_id, last_seen_at").in("user_id", ids),
      admin
        .from("deletion_requests")
        .select("user_id, execute_after")
        .is("done_at", null)
        .in("user_id", ids),
    ]);
    for (const x of dels ?? []) deletesAt.set(x.user_id, x.execute_after);
    for (const x of priv ?? []) {
      if (x.age_verified_at) ageVerified.add(x.user_id);
      if (x.dob) dobs.set(x.user_id, x.dob);
    }
    for (const x of pres ?? []) if (x.last_seen_at) seen.set(x.user_id, x.last_seen_at);
  }
  // Last active: whichever is newer, last seen in the app or last sign-in.
  const lastActive = (u: Row) => {
    const a = seen.get(u.id) ?? "";
    const b = u.last_sign_in_at ?? "";
    return (a > b ? a : b) || null;
  };

  const users = slice.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name: u.display_name ?? null,
    city: u.home_city ?? null,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
    lastActive: lastActive(u),
    dob: dobs.get(u.id) ?? null,
    confirmed: Boolean(u.email_confirmed_at),
    suspended: u.suspended_at ?? null,
    suspendedReason: u.suspended_reason ?? null,
    deleted: u.deleted_at ?? null,
    // Self-service deletions wait out a 30-day grace period; this is when it runs.
    deletesAt: u.deleted_at ? (deletesAt.get(u.id) ?? null) : null,
    admin: Boolean(u.is_admin),
    coupleId: u.couple_id ?? null,
    linkedAt: u.linked_at ?? null,
    ageVerified: ageVerified.has(u.id),
    status: u.status,
  }));

  if (pg.csv) {
    await adminAudit(a.user.id, "export", {
      table: "users",
      rows: users.length,
      filters: { q: q || null, status, linked, from, to },
    });
    return csvResponse(
      "clink-accounts",
      users.map((u) => ({
        name: u.name ?? "",
        email: u.email,
        joined: u.createdAt.slice(0, 10),
        last_sign_in: u.lastSignIn?.slice(0, 10) ?? "",
        last_active: u.lastActive?.slice(0, 16).replace("T", " ") ?? "",
        date_of_birth: u.dob ?? "",
        linked: u.coupleId ? (u.linkedAt?.slice(0, 10) ?? "yes") : "",
        status: u.status,
        age_18_declared: u.ageVerified ? "yes" : "",
        admin: u.admin ? "yes" : "",
        id: u.id,
      })),
    );
  }
  return ok({ users, total, page: pg.page, size: pg.size, sort: pg.sort, dir: pg.dir });
});
