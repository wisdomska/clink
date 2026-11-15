import type { NextRequest } from "next/server";
import { handler, ok, requireUser, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inviteCodeSchema } from "@/lib/validation";

/** "Link with [name]?" preview. Reveals only the inviter's display name for a live code. */
export const GET = handler(async (req: NextRequest) => {
  const { user } = await requireUser();
  await rateLimit(`invite-preview:${user.id}`, 30, 3600);
  const parsed = inviteCodeSchema.safeParse({ code: req.nextUrl.searchParams.get("code") ?? "" });
  if (!parsed.success) throw deny(422, "bad_code", "Codes are 6 letters and numbers.");
  const admin = supabaseAdmin();
  const { data: inv } = await admin
    .from("invites")
    .select("inviter_id, expires_at, used_at")
    .eq("code", parsed.data.code)
    .maybeSingle();
  if (!inv || inv.used_at)
    throw deny(404, "invalid_code", "That code doesn't work. Check it with your partner.");
  if (new Date(inv.expires_at) < new Date())
    throw deny(410, "expired", "That code expired. Codes last 48 h.");
  if (inv.inviter_id === user.id)
    throw deny(409, "own_code", "That's your own code. Send it to your partner.");
  const { data: p } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", inv.inviter_id)
    .single();
  return ok({ name: p?.display_name ?? "your partner" });
});
