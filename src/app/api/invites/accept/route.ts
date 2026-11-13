import { handler, ok, requireUser, parseJson, deny, activeCouple, rateLimit, audit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inviteCodeSchema } from "@/lib/validation";
import { isVerified } from "@/lib/server/verified";
import { notify } from "@/lib/server/push";

/** POST /api/invites/accept: code valid and unused; both verified; neither already linked. */
export const POST = handler(async (req) => {
  const { user } = await requireUser();
  await rateLimit(`invite-accept:${user.id}`, 10, 3600);
  const { code } = await parseJson(req, inviteCodeSchema);
  if (!isVerified(user)) throw deny(403, "unverified", "Confirm your email first, then you can link.");
  const admin = supabaseAdmin();
  const { data: inv } = await admin.from("invites").select("*").eq("code", code).maybeSingle();
  if (!inv || inv.used_at) throw deny(404, "invalid_code", "That code doesn't work. Check it with your person.");
  if (new Date(inv.expires_at) < new Date()) throw deny(410, "expired", "That code expired. Codes last 48 h.");
  if (inv.inviter_id === user.id) throw deny(409, "own_code", "That's your own code. Send it to your person.");
  if (await activeCouple(user.id)) throw deny(409, "already_linked", "You're already linked.");
  if (await activeCouple(inv.inviter_id)) throw deny(409, "inviter_linked", "They're already linked with someone.");

  const { data: inviter } = await admin.auth.admin.getUserById(inv.inviter_id);
  if (!inviter.user || !isVerified(inviter.user)) throw deny(409, "inviter_unverified", "Your person needs to confirm their email first.");
  const { data: blocks } = await admin
    .from("user_blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${inv.inviter_id}),and(blocker_id.eq.${inv.inviter_id},blocked_id.eq.${user.id})`);
  if (blocks && blocks.length) throw deny(404, "invalid_code", "That code doesn't work. Check it with your person.");

  // Claim the code atomically so it is single use.
  const { data: claimed } = await admin
    .from("invites")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", inv.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) throw deny(404, "invalid_code", "That code was just used.");

  const { data: couple, error } = await admin.from("couples").insert({}).select("id, linked_at").single();
  if (error || !couple) throw error ?? new Error("couple insert failed");
  const { error: memberErr } = await admin.from("couple_members").insert([
    { couple_id: couple.id, user_id: inv.inviter_id, role: "a" },
    { couple_id: couple.id, user_id: user.id, role: "b" },
  ]);
  if (memberErr) {
    // One of them linked in the meantime (unique active membership). Roll back.
    await admin.from("couples").delete().eq("id", couple.id);
    await admin.from("invites").update({ used_at: null, used_by: null }).eq("id", inv.id);
    throw deny(409, "already_linked", "One of you just linked with someone else.");
  }
  const { data: names } = await admin.from("profiles").select("id, display_name").in("id", [inv.inviter_id, user.id]);
  await admin.from("timeline_entries").insert({
    couple_id: couple.id,
    kind: "auto",
    title: "Linked. The first chapter.",
    happened_on: couple.linked_at.slice(0, 10),
    source_key: "linked",
  });
  await audit("couple_linked", user.id, { couple_id: couple.id });
  await audit("couple_linked", inv.inviter_id, { couple_id: couple.id });
  const me = names?.find((n) => n.id === user.id)?.display_name ?? "Your person";
  await notify(inv.inviter_id, "clinks", { title: "Clink", body: `${me} linked with you. Send your first Clink.`, url: "/link" });
  return ok({ coupleId: couple.id, partner: names?.find((n) => n.id === inv.inviter_id)?.display_name ?? "" });
});
