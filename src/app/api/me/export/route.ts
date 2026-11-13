import { zipSync, strToU8 } from "fflate";
import { handler, ok, requireUser, rateLimit } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/server/api";

/**
 * SET-03: download your own non-vault data as a zip. Built straight away
 * (well inside the 48 h promise) and available through a link for 48 h.
 */
export const POST = handler(async () => {
  const { user } = await requireUser();
  await rateLimit(`export:${user.id}`, 2, 24 * 3600);
  const admin = supabaseAdmin();
  const uid = user.id;
  const [profile, priv, msgs, moods, letters, capsules, countdowns, clinks, media] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "display_name, home_city, country, timezone, partner_nickname, phone, created_at, notify, quiet_start, quiet_end",
        )
        .eq("id", uid)
        .single(),
      admin.from("user_private").select("dob").eq("user_id", uid).maybeSingle(),
      admin
        .from("messages")
        .select("type, body, sent_at, read_at")
        .eq("sender_id", uid)
        .order("sent_at"),
      admin.from("moods").select("mood, note, created_at").eq("user_id", uid),
      admin.from("letters").select("condition, body, sealed_at, opened_at").eq("author_id", uid),
      admin.from("capsules").select("id, title, unlock_at, created_at").eq("author_id", uid),
      admin
        .from("countdowns")
        .select("title, subtitle, target_at, reveal_note")
        .eq("created_by", uid),
      admin.from("clinks").select("kind, created_at, answered_at").eq("sender_id", uid),
      admin
        .from("media")
        .select("id, kind, mime, storage_path, created_at")
        .eq("owner_id", uid)
        .eq("is_sensitive", false)
        .eq("status", "ready"),
    ]);
  const files: Record<string, Uint8Array> = {
    "README.txt": strToU8(
      "Your Clink data. Only things you created. After Dark and vault items are never included.\n",
    ),
    "profile.json": strToU8(JSON.stringify({ ...profile.data, dob: priv.data?.dob }, null, 2)),
    "messages.json": strToU8(JSON.stringify(msgs.data ?? [], null, 2)),
    "moods.json": strToU8(JSON.stringify(moods.data ?? [], null, 2)),
    "letters.json": strToU8(JSON.stringify(letters.data ?? [], null, 2)),
    "capsules.json": strToU8(JSON.stringify(capsules.data ?? [], null, 2)),
    "countdowns.json": strToU8(JSON.stringify(countdowns.data ?? [], null, 2)),
    "clinks.json": strToU8(JSON.stringify(clinks.data ?? [], null, 2)),
  };
  const s = await storage();
  let bytes = 0;
  for (const m of media.data ?? []) {
    if (bytes > 80 * 1024 * 1024) break;
    const b = await s.read("media", m.storage_path);
    if (!b) continue;
    bytes += b.length;
    files[`media/${m.created_at.slice(0, 10)}-${m.id}.${m.storage_path.split(".").pop()}`] =
      new Uint8Array(b);
  }
  const zip = zipSync(files, { level: 6 });
  const path = `${uid}/clink-export-${Date.now()}.zip`;
  await s.write("exports", path, Buffer.from(zip), "application/zip");
  const expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  await admin.from("export_requests").insert({
    user_id: uid,
    ready_at: new Date().toISOString(),
    storage_path: path,
    expires_at: expires,
  });
  await audit("data_export", uid);
  return ok({ url: await s.presignRead("exports", path, 48 * 3600), expires_at: expires });
});
