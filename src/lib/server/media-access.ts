import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deny } from "@/lib/server/api";
import type { Database } from "@/types/database";

export type MediaRow = Database["public"]["Tables"]["media"]["Row"];

/** Load a media row the caller's couple may read, or refuse with 404/410. */
export async function loadReadableMedia(id: string, userId: string): Promise<MediaRow> {
  const admin = supabaseAdmin();
  const { data: m } = await admin.from("media").select("*").eq("id", id).maybeSingle();
  if (!m) throw deny(404, "not_found", "Not found.");
  const { data: member } = await admin
    .from("couple_members")
    .select("couple_id, couples!inner(unlinked_at, read_only_until)")
    .eq("couple_id", m.couple_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) throw deny(404, "not_found", "Not found.");
  const c = member.couples as unknown as { unlinked_at: string | null; read_only_until: string | null };
  // Sensitive media is never readable once a couple has unlinked (SAF-05).
  if (c.unlinked_at && (m.is_sensitive || !c.read_only_until || new Date(c.read_only_until) < new Date())) {
    throw deny(410, "gone", "This is no longer available.");
  }
  if (m.deleted_at || m.status === "deleted") throw deny(410, "removed", "Removed by sender");
  if (m.status !== "ready") throw deny(409, "not_ready", "Still uploading.");
  if (m.expires_at && new Date(m.expires_at) <= new Date()) throw deny(410, "expired", "This has expired.");
  return m;
}
