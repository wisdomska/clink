import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";
import { storage } from "@/lib/storage";

/** Reports queue. The only content visible is what the reporter chose to attach. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const status = req.nextUrl.searchParams.get("status");
  let q = supabaseAdmin().from("reports").select("id, reporter_id, reported_user_id, category, details, attachment_paths, from_after_dark, status, priority, assigned_to, resolution, created_at, updated_at").order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  if (status && status !== "all") q = q.eq("status", status as "open");
  const { data } = await q;
  const s = await storage();
  const reports = await Promise.all(
    (data ?? []).map(async (r) => ({
      ...r,
      attachments: await Promise.all(r.attachment_paths.map((p) => s.presignRead("media", p, 600).catch(() => null))),
    })),
  );
  return ok({ reports });
});
