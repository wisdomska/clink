import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/server/api";

/**
 * SAF-05: delete every vault and View once item (all sensitive media) for a
 * couple, then verify each storage object is gone before marking the job done.
 * Also clears After Dark answers and requests for the couple.
 */
export async function executeWipe(jobId: string): Promise<{ deleted: number; verified: boolean }> {
  const admin = supabaseAdmin();
  const { data: job } = await admin.from("wipe_jobs").select("*").eq("id", jobId).single();
  if (!job || job.verified_at) return { deleted: 0, verified: true };
  const s = await storage();
  const { data: items } = await admin
    .from("media")
    .select("id, storage_path, bucket")
    .eq("couple_id", job.couple_id)
    .eq("is_sensitive", true)
    .is("storage_verified_gone_at", null);
  const paths = (items ?? []).map((m) => m.storage_path);
  let error: string | null = null;
  try {
    for (let i = 0; i < paths.length; i += 100) await s.remove("sensitive", paths.slice(i, i + 100));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  // Verify object by object.
  const gone: string[] = [];
  for (const m of items ?? []) {
    if (!(await s.exists("sensitive", m.storage_path))) gone.push(m.id);
  }
  const now = new Date().toISOString();
  if (gone.length) {
    await admin.from("media").update({ status: "deleted", deleted_at: now, storage_verified_gone_at: now }).in("id", gone);
  }
  await admin.from("deck_answers").delete().eq("couple_id", job.couple_id);
  await admin.from("desire_answers").delete().eq("couple_id", job.couple_id);
  await admin.from("nude_requests").delete().eq("couple_id", job.couple_id);
  await admin.from("dare_spins").delete().eq("couple_id", job.couple_id);
  const verified = gone.length === (items ?? []).length;
  await admin
    .from("wipe_jobs")
    .update({
      executed_at: now,
      verified_at: verified ? now : null,
      objects_deleted: job.objects_deleted + gone.length,
      attempts: job.attempts + 1,
      last_error: verified ? null : (error ?? "some objects still present"),
    })
    .eq("id", jobId);
  await audit(verified ? "wipe_verified" : "wipe_incomplete", job.requested_by, { couple_id: job.couple_id, objects: gone.length, job: jobId });
  return { deleted: gone.length, verified };
}

/** Ends a couple: read-only chat for 30 days, both back to linking, wipe queued and run now. */
export async function endCouple(coupleId: string, reason: "unlink" | "block" | "delete_account" | "admin_unlink", by: string | null) {
  const admin = supabaseAdmin();
  const now = new Date();
  const readOnly = reason === "delete_account" || reason === "block" ? now : new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const { data: members } = await admin.from("couple_members").select("user_id").eq("couple_id", coupleId).is("left_at", null);
  await admin.from("couples").update({ unlinked_at: now.toISOString(), read_only_until: readOnly.toISOString() }).eq("id", coupleId);
  await admin.from("couple_members").update({ left_at: now.toISOString() }).eq("couple_id", coupleId).is("left_at", null);
  // Consent never carries over to a future partner.
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length) {
    await admin.from("dark_settings").update({ opted_tiers: [], opted_in_at: null }).in("user_id", ids);
    await admin.from("couple_members").update({ allow_saved_spicy: false }).eq("couple_id", coupleId);
  }
  const { data: job } = await admin.from("wipe_jobs").insert({ couple_id: coupleId, reason, requested_by: by }).select("id").single();
  await audit("couple_unlinked", by, { couple_id: coupleId, reason });
  if (job) await executeWipe(job.id).catch(() => undefined); // the unlink-wipe cron job retries if this fails
  return ids;
}
