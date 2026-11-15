import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ArchiveInfo {
  coupleId: string;
  partner: string;
  until: string;
}

/**
 * ACC-07: after unlinking, the old chat stays readable (never writable) until
 * read_only_until, then the daily job deletes it. Returns the most recent such
 * couple for this user, or null.
 */
export async function readOnlyArchive(userId: string): Promise<ArchiveInfo | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("couple_members")
    .select("couple_id, couples!inner(unlinked_at, read_only_until)")
    .eq("user_id", userId)
    .not("couples.unlinked_at", "is", null)
    .gt("couples.read_only_until", new Date().toISOString())
    .order("joined_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return null;
  const c = row.couples as unknown as { read_only_until: string };
  const { data: other } = await admin
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", row.couple_id)
    .neq("user_id", userId)
    .maybeSingle();
  const { data: p } = other
    ? await admin.from("profiles").select("display_name").eq("id", other.user_id).maybeSingle()
    : { data: null };
  const partner = p?.display_name ?? "your partner";
  return { coupleId: row.couple_id, partner, until: c.read_only_until };
}
