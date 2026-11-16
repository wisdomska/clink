import type { NextRequest } from "next/server";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { CONTENT, isContentTable } from "@/lib/server/content-tables";
import { paging } from "@/lib/server/admin-list";

interface LooseQuery extends PromiseLike<{
  data: unknown[] | null;
  error: Error | null;
  count: number | null;
}> {
  order: (c: string, o: { ascending: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
  range: (a: number, b: number) => LooseQuery;
  eq: (c: string, v: string) => LooseQuery;
  is: (c: string, v: null) => LooseQuery;
}

/**
 * Content library list (one page at a time, ?page=&size=) and create. Library
 * rows only (custom couple dares are never shown). Reordering works within the
 * page: the client sends the page's offset with the new order.
 */
export const GET = handler(
  async (req: NextRequest, ctx: { params: Promise<{ table: string }> }) => {
    const { table } = await ctx.params;
    await requireAdmin();
    if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
    const cfg = CONTENT[table];
    // Table names come from a fixed allowlist, so a loosely typed builder is safe here.
    const db = supabaseAdmin() as unknown as {
      from: (t: string) => { select: (c: string, o?: { count: "exact" }) => LooseQuery };
    };
    const p = req.nextUrl.searchParams;
    const pg = paging(p, { sorts: ["sort"] as const, sort: "sort", dir: "asc" });
    const f = p.get("filter");
    const scoped = (q: LooseQuery) => {
      let out = q;
      if (cfg.filter && f) out = out.eq(cfg.filter, f);
      if (table === "dares") out = out.is("couple_id", null);
      return out;
    };
    // Stable order: sort value, then id, so pages never overlap.
    const { data, error, count } = await scoped(db.from(table).select("*", { count: "exact" }))
      .order(cfg.order, { ascending: true })
      .order("id", { ascending: true })
      .range(pg.from, pg.to);
    if (error) throw error;
    // Highest sort value in the whole list, so "Add item" lands at the very end.
    const { data: last } = await scoped(db.from(table).select(cfg.order))
      .order(cfg.order, { ascending: false })
      .limit(1);
    const maxSort = Number((last?.[0] as Record<string, unknown> | undefined)?.[cfg.order] ?? -1);
    return ok({
      rows: data ?? [],
      total: count ?? (data ?? []).length,
      page: pg.page,
      size: pg.size,
      maxSort,
    });
  },
);

export const POST = handler(async (req, ctx: { params: Promise<{ table: string }> }) => {
  const { table } = await ctx.params;
  const a = await requireAdmin({ rate: 300 });
  if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
  const row = await parseJson(req, CONTENT[table].schema);
  const { data, error } = await supabaseAdmin()
    .from(table)
    .insert(row as never)
    .select("*")
    .single();
  if (error) throw deny(422, "invalid", error.message);
  await adminAudit(a.user.id, "content_create", { table });
  return ok({ row: data }, { status: 201 });
});
