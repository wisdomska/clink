import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import {
  EXPORT_MAX,
  csvResponse,
  endOfDay,
  fetchAll,
  isDay,
  paging,
} from "@/lib/server/admin-list";

const SORTS = ["joined", "email", "name", "last_sign_in"] as const;
const STATUSES = ["active", "suspended", "deleting", "unconfirmed"] as const;
type Status = (typeof STATUSES)[number];

/** Every auth user, one page of 1,000 at a time (listUsers has no filters or sorting). */
async function allAuthUsers(): Promise<User[]> {
  const admin = supabaseAdmin();
  const out: User[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

/**
 * Users and couples: search (email or name), filters, sorting and pages.
 * Account status only, never content. ?format=csv exports the whole filtered set.
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

  const [authUsers, profiles, members] = await Promise.all([
    allAuthUsers(),
    fetchAll((f, t) =>
      admin
        .from("profiles")
        .select("id, display_name, home_city, suspended_at, suspended_reason, deleted_at, is_admin")
        .order("id")
        .range(f, t),
    ),
    fetchAll((f, t) =>
      admin
        .from("couple_members")
        .select("user_id, couple_id, couples!inner(linked_at)")
        .is("left_at", null)
        .order("user_id")
        .range(f, t),
    ),
  ]);
  const prof = new Map(profiles.map((x) => [x.id, x]));
  const couple = new Map(
    members.map((m) => [
      m.user_id,
      {
        coupleId: m.couple_id,
        linkedAt: (m.couples as unknown as { linked_at: string | null } | null)?.linked_at ?? null,
      },
    ]),
  );

  const statusOf = (u: User): Status => {
    const pr = prof.get(u.id);
    if (pr?.deleted_at) return "deleting";
    if (pr?.suspended_at) return "suspended";
    return u.email_confirmed_at ? "active" : "unconfirmed";
  };

  let rows = authUsers.filter((u) => {
    if (q) {
      const name = (prof.get(u.id)?.display_name ?? "").toLowerCase();
      if (!(u.email ?? "").toLowerCase().includes(q) && !name.includes(q)) return false;
    }
    if (status && statusOf(u) !== status) return false;
    if (linked === "linked" && !couple.has(u.id)) return false;
    if (linked === "unlinked" && couple.has(u.id)) return false;
    if (from && u.created_at < from) return false;
    if (to && u.created_at > endOfDay(to)) return false;
    return true;
  });

  const key = (u: User): string =>
    pg.sort === "email"
      ? (u.email ?? "").toLowerCase()
      : pg.sort === "name"
        ? (prof.get(u.id)?.display_name ?? "").toLowerCase()
        : pg.sort === "last_sign_in"
          ? (u.last_sign_in_at ?? "")
          : u.created_at;
  const sign = pg.dir === "asc" ? 1 : -1;
  // Ties fall back to the id so pages never shuffle between requests.
  rows = rows.sort((x, y) => {
    const a1 = key(x);
    const b1 = key(y);
    return a1 < b1 ? -sign : a1 > b1 ? sign : x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
  const total = rows.length;
  const slice = pg.csv ? rows.slice(0, EXPORT_MAX) : rows.slice(pg.from, pg.to + 1);

  const ageVerified = new Set<string>();
  const dobs = new Map<string, string>();
  const seen = new Map<string, string>();
  for (let i = 0; i < slice.length; i += 200) {
    const ids = slice.slice(i, i + 200).map((u) => u.id);
    const [{ data: priv }, { data: pres }] = await Promise.all([
      admin.from("user_private").select("user_id, dob, age_verified_at").in("user_id", ids),
      admin.from("presence").select("user_id, last_seen_at").in("user_id", ids),
    ]);
    for (const x of priv ?? []) {
      if (x.age_verified_at) ageVerified.add(x.user_id);
      if (x.dob) dobs.set(x.user_id, x.dob);
    }
    for (const x of pres ?? []) if (x.last_seen_at) seen.set(x.user_id, x.last_seen_at);
  }
  // Last active: whichever is newer, last seen in the app or last sign-in.
  const lastActive = (u: User) => {
    const a = seen.get(u.id) ?? "";
    const b = u.last_sign_in_at ?? "";
    return (a > b ? a : b) || null;
  };

  const users = slice.map((u) => {
    const pr = prof.get(u.id);
    const c = couple.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      name: pr?.display_name ?? null,
      city: pr?.home_city ?? null,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      lastActive: lastActive(u),
      dob: dobs.get(u.id) ?? null,
      confirmed: Boolean(u.email_confirmed_at),
      suspended: pr?.suspended_at ?? null,
      suspendedReason: pr?.suspended_reason ?? null,
      deleted: pr?.deleted_at ?? null,
      admin: Boolean(pr?.is_admin),
      coupleId: c?.coupleId ?? null,
      linkedAt: c?.linkedAt ?? null,
      ageVerified: ageVerified.has(u.id),
      status: statusOf(u),
    };
  });

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
