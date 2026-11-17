import { handler, ok, requireCouple, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyLater } from "@/lib/server/push";

/** Break the seal. Only the recipient can open it, any time; the writer gets a little note. */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { user, coupleId } = await requireCouple();
  const admin = supabaseAdmin();
  const { data: l } = await admin
    .from("letters")
    .select("id, couple_id, author_id, condition, opened_at")
    .eq("id", id)
    .maybeSingle();
  if (!l || l.couple_id !== coupleId) throw deny(404, "not_found", "Not found.");
  if (l.author_id === user.id) throw deny(403, "own_letter", "This one's for them to open.");
  if (!l.opened_at) {
    await admin.from("letters").update({ opened_at: new Date().toISOString() }).eq("id", id);
    const { data: me } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    notifyLater(l.author_id, "keepsakes", {
      body: `${me?.display_name ?? "They"} opened "${l.condition}"`,
      url: "/keep",
    });
  }
  return ok({ ok: true });
});
