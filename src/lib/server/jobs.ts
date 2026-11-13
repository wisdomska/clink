import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { notify } from "@/lib/server/push";
import { executeWipe } from "@/lib/server/wipe";
import { audit } from "@/lib/server/api";
import { wallTime } from "@/lib/time";

/** expire-media: files past expires_at, and View once items closed over 60 s ago. Verified gone. */
export async function expireMedia() {
  const admin = supabaseAdmin();
  const s = await storage();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60_000).toISOString();
  const [{ data: expired }, { data: viewed }] = await Promise.all([
    admin
      .from("media")
      .select("id, bucket, storage_path")
      .lte("expires_at", now.toISOString())
      .is("storage_verified_gone_at", null)
      .limit(500),
    admin
      .from("media")
      .select("id, bucket, storage_path")
      .eq("retention", "once")
      .lte("closed_at", cutoff)
      .is("storage_verified_gone_at", null)
      .limit(500),
  ]);
  // View once opened but never closed (app killed): treat 10 minutes after first view as closed.
  const { data: stale } = await admin
    .from("media")
    .select("id, bucket, storage_path")
    .eq("retention", "once")
    .is("closed_at", null)
    .lte("viewed_at", new Date(now.getTime() - 10 * 60_000).toISOString())
    .is("storage_verified_gone_at", null)
    .limit(500);
  const items = [...(expired ?? []), ...(viewed ?? []), ...(stale ?? [])];
  let gone = 0;
  for (const bucket of ["media", "sensitive"] as const) {
    const paths = items.filter((i) => i.bucket === bucket).map((i) => i.storage_path);
    if (paths.length) await s.remove(bucket, paths).catch(() => undefined);
  }
  for (const m of items) {
    if (!(await s.exists(m.bucket as "media" | "sensitive", m.storage_path))) {
      await admin
        .from("media")
        .update({
          status: "deleted",
          deleted_at: now.toISOString(),
          storage_verified_gone_at: now.toISOString(),
        })
        .eq("id", m.id);
      gone++;
    }
  }
  return { checked: items.length, gone };
}

/** unlink-wipe: retry any wipe that hasn't been verified yet. */
export async function retryWipes() {
  const { data } = await supabaseAdmin()
    .from("wipe_jobs")
    .select("id")
    .is("verified_at", null)
    .lt("attempts", 50)
    .limit(50);
  let verified = 0;
  for (const j of data ?? []) if ((await executeWipe(j.id)).verified) verified++;
  return { pending: data?.length ?? 0, verified };
}

/** date-reminders: 1 day and 1 hour before, shown in each partner's local time. */
export async function dateReminders() {
  const admin = supabaseAdmin();
  const now = Date.now();
  const { data: dates } = await admin
    .from("scheduled_dates")
    .select("id, couple_id, start_at, reminded_1d_at, reminded_1h_at, date_kits(title)")
    .eq("status", "scheduled")
    .gt("start_at", new Date(now).toISOString())
    .lt("start_at", new Date(now + 25 * 3600 * 1000).toISOString());
  let sent = 0;
  for (const d of dates ?? []) {
    const ms = new Date(d.start_at).getTime() - now;
    const which =
      ms <= 65 * 60 * 1000 && !d.reminded_1h_at
        ? "1h"
        : ms <= 24 * 3600 * 1000 + 5 * 60 * 1000 && ms > 65 * 60 * 1000 && !d.reminded_1d_at
          ? "1d"
          : null;
    if (!which) continue;
    const title = (d.date_kits as unknown as { title: string } | null)?.title ?? "Your date";
    const { data: members } = await admin
      .from("couple_members")
      .select("user_id, profiles(timezone)")
      .eq("couple_id", d.couple_id)
      .is("left_at", null);
    for (const m of members ?? []) {
      const tz = (m.profiles as unknown as { timezone: string } | null)?.timezone ?? "UTC";
      const at = wallTime(new Date(d.start_at), tz, which === "1d");
      const r = await notify(
        m.user_id,
        "dates",
        {
          body: which === "1h" ? `${title} in an hour, at ${at}.` : `${title} tomorrow at ${at}.`,
          url: "/plans",
        },
        `date:${d.id}:${which}`,
      );
      sent += r.sent;
    }
    await admin
      .from("scheduled_dates")
      .update(
        which === "1h"
          ? { reminded_1h_at: new Date().toISOString() }
          : { reminded_1d_at: new Date().toISOString() },
      )
      .eq("id", d.id);
  }
  return { sent };
}

/** capsule-unlock: tell both partners when a capsule is ready. */
export async function capsuleUnlock() {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("capsules")
    .select("id, couple_id, title")
    .lte("unlock_at", new Date().toISOString())
    .is("notified_at", null)
    .limit(200);
  for (const c of data ?? []) {
    const { data: members } = await admin
      .from("couple_members")
      .select("user_id")
      .eq("couple_id", c.couple_id)
      .is("left_at", null);
    for (const m of members ?? [])
      await notify(
        m.user_id,
        "keepsakes",
        { body: `"${c.title}" is ready to uncork.`, url: `/keep/capsules/${c.id}` },
        `capsule:${c.id}`,
      );
    await admin.from("capsules").update({ notified_at: new Date().toISOString() }).eq("id", c.id);
  }
  return { notified: data?.length ?? 0 };
}

/** account-deletion: hard-delete accounts 30 days after the request, media first. */
export async function accountDeletion() {
  const admin = supabaseAdmin();
  const s = await storage();
  const { data } = await admin
    .from("deletion_requests")
    .select("user_id")
    .lte("execute_after", new Date().toISOString())
    .is("done_at", null)
    .limit(50);
  for (const r of data ?? []) {
    const { data: media } = await admin
      .from("media")
      .select("bucket, storage_path")
      .eq("owner_id", r.user_id);
    for (const bucket of ["media", "sensitive"] as const) {
      const paths = (media ?? []).filter((m) => m.bucket === bucket).map((m) => m.storage_path);
      for (let i = 0; i < paths.length; i += 100)
        await s.remove(bucket, paths.slice(i, i + 100)).catch(() => undefined);
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("avatar_path")
      .eq("id", r.user_id)
      .maybeSingle();
    if (profile?.avatar_path) await s.remove("media", [profile.avatar_path]).catch(() => undefined);
    await admin
      .from("deletion_requests")
      .update({ done_at: new Date().toISOString() })
      .eq("user_id", r.user_id);
    await admin.auth.admin.deleteUser(r.user_id); // cascades every row the user owns
    await audit("account_deleted", null, { user: r.user_id.slice(0, 8) });
  }
  return { deleted: data?.length ?? 0 };
}

/** Exports expire after 48 h. */
export async function exportCleanup() {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("export_requests")
    .select("id, storage_path")
    .lte("expires_at", new Date().toISOString())
    .not("storage_path", "is", null)
    .limit(200);
  const paths = (data ?? []).map((d) => d.storage_path!).filter(Boolean);
  if (paths.length) await (await storage()).remove("exports", paths).catch(() => undefined);
  if (data?.length)
    await admin
      .from("export_requests")
      .update({ storage_path: null })
      .in(
        "id",
        data.map((d) => d.id),
      );
  return { removed: paths.length };
}
