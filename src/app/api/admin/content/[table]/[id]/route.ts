import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { CONTENT, isContentTable } from "@/lib/server/content-tables";

/** Edit, reorder, enable or disable a content row. */
export const PATCH = handler(
  async (req, ctx: { params: Promise<{ table: string; id: string }> }) => {
    const { table, id } = await ctx.params;
    const a = await requireAdmin({ rate: 600 });
    if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
    const patch = await parseJson(req, CONTENT[table].schema.partial());
    const key = "id";
    let q = supabaseAdmin()
      .from(table)
      .update(patch as never)
      .eq(key, id);
    if (table === "dares") q = q.is("couple_id", null);
    const { data, error } = await q.select("*").maybeSingle();
    if (error || !data) throw deny(404, "not_found", error?.message ?? "No such row.");
    await adminAudit(a.user.id, "content_update", { table, id, fields: Object.keys(patch) });
    return ok({ row: data });
  },
);
