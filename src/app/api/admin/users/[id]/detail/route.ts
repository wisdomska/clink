import { handler, ok, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/admin";

const DAY = 86_400_000;

/**
 * Everything an admin may know about one user: account, profile, couple,
 * activity counts, a 30-day activity chart and a timeline of events.
 * Never message text, media, After Dark content or date of birth (age only).
 */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: authUser } = await db.auth.admin.getUserById(id);
  const u = authUser.user;
  if (!u) throw deny(404, "not_found", "No such user.");

  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();
  const count = async (
    table: string,
    col: string,
    extra?: (q: ReturnType<typeof db.from>) => unknown,
    from?: string,
  ) => {
    let q = db
      .from(table as "messages")
      .select("*", { count: "exact", head: true })
      .eq(col, id);
    if (from) q = q.gte("created_at", from);
    if (extra) q = extra(q as never) as typeof q;
    const { count: n } = await q;
    return n ?? 0;
  };

  const [
    { data: profile },
    { data: priv },
    { data: presence },
    { data: memberRows },
    { data: dark },
    { data: msgs30 },
    { data: clinks30 },
    { data: audits },
    { data: reportsAbout },
    { data: reportsBy },
    { data: media },
    { data: push },
  ] = await Promise.all([
    db
      .from("profiles")
      .select(
        "display_name, avatar_kind, avatar_icon, home_city, country, timezone, onboarded_at, suspended_at, is_admin, discreet_mode, app_icon, quiet_start, quiet_end, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    db.from("user_private").select("dob").eq("user_id", id).maybeSingle(),
    db.from("presence").select("status, last_seen_at").eq("user_id", id).maybeSingle(),
    db
      .from("couple_members")
      .select("couple_id, role, joined_at, left_at")
      .eq("user_id", id)
      .order("joined_at", { ascending: false }),
    db.from("dark_settings").select("opted_in_at").eq("user_id", id).maybeSingle(),
    db
      .from("messages")
      .select("type, sent_at")
      .eq("sender_id", id)
      .gte("sent_at", since30)
      .limit(5000),
    db
      .from("clinks")
      .select("created_at")
      .eq("sender_id", id)
      .gte("created_at", since30)
      .limit(5000),
    db
      .from("audit_events")
      .select("event, meta, created_at, actor_id")
      .or(`user_id.eq.${id},actor_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(60),
    db
      .from("reports")
      .select("id, category, status, created_at")
      .eq("reported_user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("reports")
      .select("id, category, status, created_at")
      .eq("reporter_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("media")
      .select("kind, size_bytes, is_sensitive")
      .eq("owner_id", id)
      .is("deleted_at", null)
      .limit(10000),
    db.from("push_subscriptions").select("created_at").eq("user_id", id),
  ]);

  const current = memberRows?.find((m) => !m.left_at) ?? null;
  let couple = null;
  if (current) {
    const [{ data: c }, { data: other }] = await Promise.all([
      db
        .from("couples")
        .select("id, linked_at, started_on, chat_theme")
        .eq("id", current.couple_id)
        .maybeSingle(),
      db
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", current.couple_id)
        .neq("user_id", id)
        .is("left_at", null)
        .maybeSingle(),
    ]);
    let partner = null;
    if (other) {
      const [{ data: pp }, { data: pa }] = await Promise.all([
        db.from("profiles").select("display_name").eq("id", other.user_id).maybeSingle(),
        db.auth.admin.getUserById(other.user_id),
      ]);
      partner = { id: other.user_id, name: pp?.display_name ?? "", email: pa.user?.email ?? "" };
    }
    const [{ data: games }, gamesTotal] = await Promise.all([
      db
        .from("games")
        .select("type, status, winner_id, finished_at")
        .eq("couple_id", current.couple_id)
        .eq("status", "finished")
        .order("finished_at", { ascending: false })
        .limit(500),
      db
        .from("games")
        .select("*", { count: "exact", head: true })
        .eq("couple_id", current.couple_id)
        .then((r) => r.count ?? 0),
    ]);
    const byType: Record<string, number> = {};
    (games ?? []).forEach((g) => (byType[g.type] = (byType[g.type] ?? 0) + 1));
    couple = {
      id: c?.id,
      role: current.role,
      linkedAt: c?.linked_at,
      startedOn: c?.started_on,
      chatTheme: c?.chat_theme,
      partner,
      games: {
        total: gamesTotal,
        finished: games?.length ?? 0,
        won: (games ?? []).filter((g) => g.winner_id === id).length,
        byType,
        last: games?.[0]?.finished_at ?? null,
      },
    };
  }

  // 30-day chart: messages and clinks per day.
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * DAY);
    return d.toISOString().slice(0, 10);
  });
  const perDay = Object.fromEntries(days.map((d) => [d, 0]));
  (msgs30 ?? []).forEach((m) => {
    const k = m.sent_at.slice(0, 10);
    if (k in perDay) perDay[k]! += 1;
  });
  (clinks30 ?? []).forEach((c) => {
    const k = c.created_at.slice(0, 10);
    if (k in perDay) perDay[k]! += 1;
  });
  const msgTypes: Record<string, number> = {};
  (msgs30 ?? []).forEach((m) => {
    const t = m.type === "system" ? "call" : m.type;
    msgTypes[t] = (msgTypes[t] ?? 0) + 1;
  });

  const [messagesTotal, clinksTotal, moodsTotal, letters, capsules, countdowns, msgs7] =
    await Promise.all([
      count("messages", "sender_id"),
      count("clinks", "sender_id"),
      count("moods", "user_id"),
      count("letters", "author_id").catch(() => 0),
      count("capsules", "author_id").catch(() => 0),
      count("countdowns", "created_by").catch(() => 0),
      db
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", id)
        .gte("sent_at", since7)
        .then((r) => r.count ?? 0),
    ]);

  const dob = priv?.dob ? new Date(priv.dob) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.2425 * DAY)) : null;

  return ok({
    account: {
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      confirmedAt: u.email_confirmed_at ?? null,
      providers:
        (u.app_metadata?.providers as string[] | undefined) ??
        [u.app_metadata?.provider].filter(Boolean),
      passkeys: (u.factors ?? []).filter((f) => f.factor_type === "webauthn").length,
      mustChangePassword: Boolean(u.app_metadata?.must_change_password),
      bannedUntil: (u as { banned_until?: string }).banned_until ?? null,
    },
    profile: profile ? { ...profile, age } : null,
    presence: presence ?? null,
    couple,
    pastCouples: (memberRows ?? []).filter((m) => m.left_at).length,
    afterDark: { optedIn: Boolean(dark?.opted_in_at), since: dark?.opted_in_at ?? null },
    pushDevices: push?.length ?? 0,
    counts: {
      messagesTotal,
      messages7: msgs7,
      messages30: msgs30?.length ?? 0,
      clinksTotal,
      clinks30: clinks30?.length ?? 0,
      moodsTotal,
      letters,
      capsules,
      countdowns,
      msgTypes,
    },
    storage: {
      files: media?.length ?? 0,
      bytes: (media ?? []).reduce((s, m) => s + (m.size_bytes ?? 0), 0),
      images: (media ?? []).filter((m) => m.kind === "image").length,
      videos: (media ?? []).filter((m) => m.kind === "video").length,
      audio: (media ?? []).filter((m) => m.kind === "audio").length,
      private: (media ?? []).filter((m) => m.is_sensitive).length,
    },
    chart: days.map((d) => ({ day: d, n: perDay[d]! })),
    timeline: (audits ?? []).map((a) => ({
      event: a.event,
      at: a.created_at,
      byAdmin: a.event.startsWith("admin."),
      meta: a.meta,
    })),
    reports: { about: reportsAbout ?? [], by: reportsBy ?? [] },
  });
});
