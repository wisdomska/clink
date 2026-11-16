import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { CONTENT, isContentTable } from "@/lib/server/content-tables";
import { fetchAll } from "@/lib/server/admin-list";

type Id = string | number;
interface LooseQuery extends PromiseLike<{
  data: Array<{ id: Id; sort: number }> | null;
  error: unknown;
}> {
  order: (c: string, o: { ascending: boolean }) => LooseQuery;
  range: (a: number, b: number) => LooseQuery;
  eq: (c: string, v: string) => LooseQuery;
  is: (c: string, v: null) => LooseQuery;
}

/**
 * Save a list's order in one go. Swapping two sort values broke when rows
 * shared a value, so the list is renumbered (sort = position).
 *
 * With pages, the client sends one page's ids, that page's offset and the list
 * filter (deck or tier). The page is spliced into the whole list at that offset
 * and the whole list is renumbered, so rows never jump between pages even if
 * older sort values had gaps or repeats. Without a filter on a filtered table,
 * the ids are numbered from the offset directly (the original behaviour).
 */
export const POST = handler(async (req, ctx: { params: Promise<{ table: string }> }) => {
  const { table } = await ctx.params;
  const a = await requireAdmin({ rate: 600 });
  if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
  const { ids, offset, filter } = await parseJson(
    req,
    z.object({
      ids: z
        .array(z.union([z.string().min(1), z.number()]))
        .min(1)
        .max(500),
      offset: z.number().int().min(0).max(100000).default(0),
      filter: z.string().trim().min(1).max(80).optional(),
    }),
  );
  const cfg = CONTENT[table];
  const db = supabaseAdmin();
  let order: Array<{ id: Id; sort: number | null }>;
  if (cfg.filter && !filter) {
    order = ids.map((id) => ({ id, sort: null }));
  } else {
    const loose = db as unknown as {
      from: (t: string) => { select: (c: string) => LooseQuery };
    };
    const all = await fetchAll((f, t) => {
      let q = loose.from(table).select("id, sort");
      if (cfg.filter && filter) q = q.eq(cfg.filter, filter);
      if (table === "dares") q = q.is("couple_id", null);
      return q.order("sort", { ascending: true }).order("id", { ascending: true }).range(f, t);
    });
    const moving = new Set(ids.map(String));
    const known = new Map(all.map((r) => [String(r.id), r]));
    if (ids.some((id) => !known.has(String(id))))
      throw deny(422, "invalid", "That list changed. Reload and try again.");
    const rest = all.filter((r) => !moving.has(String(r.id)));
    const at = Math.min(offset, rest.length);
    order = [...rest.slice(0, at), ...ids.map((id) => known.get(String(id))!), ...rest.slice(at)];
  }
  const start = cfg.filter && !filter ? offset : 0;
  const results = await Promise.all(
    order
      .map((r, i) => ({ ...r, next: start + i }))
      .filter((r) => r.sort !== r.next)
      .map((r) =>
        db
          .from(table)
          .update({ sort: r.next } as never)
          .eq("id", r.id as never),
      ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw deny(422, "invalid", failed.error.message);
  await adminAudit(a.user.id, "content_reorder", { table, count: ids.length, offset });
  return ok({ ok: true });
});
