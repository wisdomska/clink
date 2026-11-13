import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

/** Search users and couples by email or name. Account status only, never content. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0));
  const admin = supabaseAdmin();
  const { data: authUsers } = await admin.auth.admin.listUsers({ page: page + 1, perPage: 200 });
  let users = authUsers?.users ?? [];
  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, display_name, home_city, created_at, suspended_at, suspended_reason, deleted_at, is_admin",
    )
    .in(
      "id",
      users.map((u) => u.id),
    );
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  if (q)
    users = users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (byId.get(u.id)?.display_name ?? "").toLowerCase().includes(q),
    );
  const ids = users.map((u) => u.id);
  const { data: members } = await admin
    .from("couple_members")
    .select("user_id, couple_id, couples!inner(linked_at, unlinked_at)")
    .in("user_id", ids)
    .is("left_at", null);
  const { data: priv } = await admin
    .from("user_private")
    .select("user_id, age_verified_at")
    .in("user_id", ids);
  return ok({
    users: users.slice(0, 100).map((u) => {
      const p = byId.get(u.id);
      const c = members?.find((m) => m.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        name: p?.display_name ?? null,
        city: p?.home_city ?? null,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        confirmed: Boolean(u.email_confirmed_at),
        suspended: p?.suspended_at ?? null,
        suspendedReason: p?.suspended_reason ?? null,
        deleted: p?.deleted_at ?? null,
        admin: Boolean(p?.is_admin),
        coupleId: c?.couple_id ?? null,
        linkedAt: (c?.couples as unknown as { linked_at: string } | undefined)?.linked_at ?? null,
        ageVerified: Boolean(priv?.find((x) => x.user_id === u.id)?.age_verified_at),
      };
    }),
  });
});
