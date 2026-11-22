import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { notify } from "@/lib/server/push";
import { executeWipe } from "@/lib/server/wipe";
import { activeCouple, audit } from "@/lib/server/api";
import { wallTime } from "@/lib/time";
import { reachedMilestones } from "@/lib/milestones";

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

/**
 * Delete one account for good: their media files first, then the auth user,
 * which cascades every row they own. Used by the job and by admin "Delete".
 */
export async function hardDeleteUser(userId: string) {
  const admin = supabaseAdmin();
  const s = await storage();
  const { data: media } = await admin
    .from("media")
    .select("bucket, storage_path")
    .eq("owner_id", userId);
  for (const bucket of ["media", "sensitive"] as const) {
    const paths = (media ?? []).filter((m) => m.bucket === bucket).map((m) => m.storage_path);
    for (let i = 0; i < paths.length; i += 100)
      await s.remove(bucket, paths.slice(i, i + 100)).catch(() => undefined);
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.avatar_path) await s.remove("media", [profile.avatar_path]).catch(() => undefined);
  await admin
    .from("deletion_requests")
    .update({ done_at: new Date().toISOString() })
    .eq("user_id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId); // cascades every row the user owns
  if (error) throw error;
  await audit("account_deleted", null, { user: userId.slice(0, 8) });
}

/** account-deletion: hard-delete accounts whose grace period has passed (30 days for self-service). */
export async function accountDeletion() {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("deletion_requests")
    .select("user_id")
    .lte("execute_after", new Date().toISOString())
    .is("done_at", null)
    .limit(50);
  for (const r of data ?? []) await hardDeleteUser(r.user_id);
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

/** milestones (KEEP-03, ACC-06): 100 days, 500, 1000 and each anniversary on the timeline. */
export async function milestones() {
  const admin = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  let added = 0;
  for (let from = 0; ; from += 500) {
    const { data: couples } = await admin
      .from("couples")
      .select("id, started_on, linked_at")
      .is("unlinked_at", null)
      .range(from, from + 499);
    if (!couples?.length) break;
    const rows = couples.flatMap((c) =>
      reachedMilestones(c.started_on ?? c.linked_at.slice(0, 10), today, Boolean(c.started_on)).map(
        (m) => ({
          couple_id: c.id,
          kind: "auto",
          title: m.title,
          happened_on: m.date,
          source_key: m.key,
        }),
      ),
    );
    if (rows.length) {
      const { data } = await admin
        .from("timeline_entries")
        .upsert(rows, { onConflict: "couple_id,source_key", ignoreDuplicates: true })
        .select("id");
      added += data?.length ?? 0;
    }
    if (couples.length < 500) break;
  }
  return { added };
}

/**
 * "On this day": once a day, from 9am in each person's own time zone, a
 * gentle nudge when today is the anniversary of a photo or a timeline moment
 * from a year or more ago. Only real anniversaries, so it stays a treat.
 * Runs with the 5-minute tick; the dedupe key keeps it to one a day.
 */
export async function onThisDay() {
  const admin = supabaseAdmin();
  const { data: due, error } = await admin.rpc("svc_on_this_day_due");
  if (error) throw error;
  let sent = 0;
  for (const d of due ?? []) {
    const ago = d.years === 1 ? "A year ago today" : `${d.years} years ago today`;
    const r = await notify(
      d.user_id,
      "keepsakes",
      { body: `${ago}: ${d.label}. Have a look.`, url: "/us", tag: "on-this-day" },
      `otd:${d.day_key}`,
    );
    sent += r.sent;
  }
  return { sent, nudged: due?.length ?? 0 };
}

/**
 * A day after you make a link code, if your partner still hasn't joined, one
 * gentle reminder while the code still works (codes last 48 hours). Once per
 * code, respecting notification settings and quiet hours (it waits for them).
 */
export async function inviteReminders() {
  const admin = supabaseAdmin();
  const now = Date.now();
  const { data, error } = await admin
    .from("invites")
    .select("id, inviter_id")
    .is("used_at", null)
    .is("reminded_at", null)
    .lt("created_at", new Date(now - 24 * 3600_000).toISOString())
    .gt("expires_at", new Date(now + 15 * 60_000).toISOString())
    .limit(200);
  if (error) throw error;
  let sent = 0;
  let nudged = 0;
  for (const i of data ?? []) {
    if (await activeCouple(i.inviter_id)) continue;
    const r = await notify(
      i.inviter_id,
      "dates",
      {
        body: "Your partner hasn't joined yet. Your code works for about one more day. Send it again?",
        url: "/link",
        tag: "invite",
      },
      `invite:${i.id}`,
    );
    // Quiet hours: try again on a later run. Anything else (sent, turned off,
    // no device) settles it for this code.
    if (r.skipped === "quiet_hours") continue;
    await admin.from("invites").update({ reminded_at: new Date().toISOString() }).eq("id", i.id);
    nudged++;
    sent += r.sent;
  }
  return { sent, nudged };
}

/** A ~16px blurred preview (data URL), like the one devices make when uploading. */
export async function placeholderFor(image: Buffer): Promise<string | null> {
  const { default: sharp } = await import("sharp");
  for (const quality of [50, 30]) {
    const out = await sharp(image, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: 16 })
      .webp({ quality })
      .toBuffer();
    const url = `data:image/webp;base64,${out.toString("base64")}`;
    if (url.length <= 2000) return url;
  }
  return null;
}

/**
 * placeholder-backfill: blurred previews for photos shared before they existed,
 * newest first, a few per run until none are left. Only the ordinary media
 * bucket: sensitive (After Dark) media never gets one.
 */
export async function backfillPlaceholders(batch = 20) {
  const admin = supabaseAdmin();
  const { data: rows, error } = await admin
    .from("media")
    .select("id, bucket, is_sensitive, storage_path")
    .eq("kind", "image")
    .eq("bucket", "media")
    .eq("is_sensitive", false)
    .eq("status", "ready")
    .is("placeholder", null)
    .is("placeholder_tried_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(batch);
  if (error) throw error;
  if (!rows?.length) return { made: 0, left: 0 };
  const s = await storage();
  let made = 0;
  for (const m of rows) {
    if (m.bucket !== "media" || m.is_sensitive) continue;
    let placeholder: string | null = null;
    try {
      const raw = await s.read("media", m.storage_path);
      if (raw) placeholder = await placeholderFor(raw);
    } catch {
      placeholder = null;
    }
    await admin
      .from("media")
      .update({ placeholder, placeholder_tried_at: new Date().toISOString() })
      .eq("id", m.id)
      .eq("bucket", "media")
      .eq("is_sensitive", false);
    if (placeholder) made++;
  }
  return { made, tried: rows.length };
}
