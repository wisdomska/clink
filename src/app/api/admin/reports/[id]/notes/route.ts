import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { isUuid } from "@/lib/server/admin-list";

interface Note {
  id: string;
  admin_id: string | null;
  kind: "note" | "status" | "assign";
  body: string;
  created_at: string;
}
type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        order: (
          c: string,
          o: { ascending: boolean },
        ) => { limit: (n: number) => PromiseLike<{ data: Note[] | null; error: unknown }> };
        maybeSingle: () => PromiseLike<{ data: { id: string } | null; error: unknown }>;
      };
    };
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => { single: () => PromiseLike<{ data: Note | null; error: unknown }> };
    };
  };
};

/** A report's internal notes and status history, oldest first. Admins only. */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await requireAdmin();
  if (!isUuid(id)) throw deny(404, "not_found", "No such report.");
  const db = supabaseAdmin() as unknown as Loose;
  const { data, error } = await db
    .from("report_notes")
    .select("id, admin_id, kind, body, created_at")
    .eq("report_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const notes = data ?? [];
  const ids = [...new Set(notes.map((n) => n.admin_id).filter(isUuid))];
  const { data: admins } = ids.length
    ? await supabaseAdmin().from("admin_accounts").select("id, name, email").in("id", ids)
    : { data: [] as Array<{ id: string; name: string; email: string }> };
  const nameOf = new Map(
    (admins ?? []).map((x) => [x.id, x.name && x.name !== "Admin" ? x.name : x.email]),
  );
  return ok({
    notes: notes.map((n) => ({ ...n, by: n.admin_id ? (nameOf.get(n.admin_id) ?? null) : null })),
  });
});

/** Add an internal note. Never shown to the people in the report. */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const a = await requireAdmin({ rate: 300 });
  if (!isUuid(id)) throw deny(404, "not_found", "No such report.");
  const { body } = await parseJson(req, z.object({ body: z.string().trim().min(1).max(2000) }));
  const db = supabaseAdmin() as unknown as Loose;
  const { data: report } = await db.from("reports").select("id").eq("id", id).maybeSingle();
  if (!report) throw deny(404, "not_found", "No such report.");
  const { data, error } = await db
    .from("report_notes")
    .insert({ report_id: id, admin_id: a.account.id, kind: "note", body })
    .select("id, admin_id, kind, body, created_at")
    .single();
  if (error || !data) throw deny(422, "invalid", "Couldn't save that note. Try again.");
  await adminAudit(a.user.id, "report_note", { report: id });
  return ok({ note: { ...data, by: a.name } }, { status: 201 });
});
