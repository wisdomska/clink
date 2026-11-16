import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, adminAudit } from "@/lib/server/admin";
import { isContentTable } from "@/lib/server/content-tables";

/**
 * Save a whole list's order in one go: each id gets sort = its index. Swapping
 * two sort values broke when rows shared a value, so the list is renumbered.
 */
export const POST = handler(async (req, ctx: { params: Promise<{ table: string }> }) => {
  const { table } = await ctx.params;
  const a = await requireAdmin({ rate: 600 });
  if (!isContentTable(table)) throw deny(404, "no_table", "Unknown content type.");
  const { ids } = await parseJson(
    req,
    z.object({
      ids: z
        .array(z.union([z.string().min(1), z.number()]))
        .min(1)
        .max(500),
    }),
  );
  const db = supabaseAdmin();
  const results = await Promise.all(
    ids.map((id, sort) =>
      db
        .from(table)
        .update({ sort } as never)
        .eq("id", id as never),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw deny(422, "invalid", failed.error.message);
  await adminAudit(a.user.id, "content_reorder", { table, count: ids.length });
  return ok({ ok: true });
});
