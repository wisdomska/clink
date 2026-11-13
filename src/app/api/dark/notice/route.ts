import { handler, ok } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark } from "@/lib/server/dark";

/** SAF-06: the one-time screenshot notice has been seen. */
export const POST = handler(async () => {
  const d = await requireDark();
  await supabaseAdmin()
    .from("dark_settings")
    .update({ notice_seen_at: new Date().toISOString() })
    .eq("user_id", d.user.id);
  return ok({ ok: true });
});
