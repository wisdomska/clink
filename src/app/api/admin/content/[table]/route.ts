import type { NextRequest } from "next/server";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { CONTENT, isContentTable } from "@/lib/server/content-tables";

interface LooseQuery extends PromiseLike<{ data: unknown[] | null; error: Error | null }> {
  order: (c: string, o: { ascending: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
  eq: (c: string, v: string) => LooseQuery;
  is: (c: string, v: null) => LooseQuery;
}

/** Content library list and create. Library rows only (custom couple dares are never shown). */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ table: string }> }) => {
  const { table } = await ctx.params;
  await requireAdmin();
  if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
  const cfg = CONTENT[table];
  // Table names come from a fixed allowlist, so a loosely typed builder is safe here.
  const db = supabaseAdmin() as unknown as { from: (t: string) => { select: (c: string) => LooseQuery } };
  let q = db.from(table).select("*").order(cfg.order, { ascending: true }).limit(500);
  const f = req.nextUrl.searchParams.get("filter");
  if (cfg.filter && f) q = q.eq(cfg.filter, f);
  if (table === "dares") q = q.is("couple_id", null);
  const { data, error } = await q;
  if (error) throw error;
  return ok({ rows: data ?? [] });
});

export const POST = handler(async (req, ctx: { params: Promise<{ table: string }> }) => {
  const { table } = await ctx.params;
  const a = await requireAdmin({ rate: 300 });
  if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
  const row = await parseJson(req, CONTENT[table].schema);
  const { data, error } = await supabaseAdmin().from(table).insert(row as never).select("*").single();
  if (error) throw deny(422, "invalid", error.message);
  await adminAudit(a.user.id, "content_create", { table });
  return ok({ row: data }, { status: 201 });
});
