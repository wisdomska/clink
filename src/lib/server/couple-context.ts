import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journeyStep, pathFor } from "@/lib/server/journey";
import { activeCouple } from "@/lib/server/api";
import { storage } from "@/lib/storage";
import { appLockEnabled, isAppUnlocked } from "@/lib/server/app-lock";
import type { CoupleContextValue, Person } from "@/features/couple/types";
import { DEFAULT_AVATAR, toMemoji } from "@/lib/avatars";

async function avatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return await (await storage()).presignRead("media", path, 3600);
  } catch {
    return null;
  }
}

/** Everything the signed-in app shell needs. Redirects when the user isn't ready. */
export async function loadCoupleContext(nextPath: string): Promise<CoupleContextValue> {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/auth/reset?next=${encodeURIComponent(nextPath)}`);
  // These don't depend on each other: ask the database once, in parallel.
  const [step, appLock, couple] = await Promise.all([
    journeyStep(user.id),
    appLockEnabled(user.id),
    activeCouple(user.id),
  ]);
  // Not linked yet is fine: the app opens in solo mode instead of trapping you on /link.
  if (step !== "app" && step !== "link") redirect(pathFor(step));
  // CHAT-07: optional PIN on open. Nothing is loaded until it is entered.
  if (appLock && !(await isAppUnlocked(user.id)))
    redirect(`/unlock?next=${encodeURIComponent(nextPath)}`);
  const admin = supabaseAdmin();
  const cols =
    "id, display_name, avatar_kind, avatar_icon, avatar_path, home_city, country, timezone, latitude, longitude, partner_nickname, phone, discreet_mode, app_icon, notify, quiet_start, quiet_end, suspended_at, is_admin, bio, love_language, share_birthday";
  if (!couple) return soloContext(user.id, user.email ?? null, appLock, cols);
  const [{ data: people }, { data: c }, { data: members }, { data: dark }, { data: dobs }] =
    await Promise.all([
      admin.from("profiles").select(cols).in("id", [user.id, couple.partnerId]),
      admin
        .from("couples")
        .select(
          "id, started_on, linked_at, chat_theme, chat_wallpaper, chat_wallpaper_media, chat_wallpaper_blur, ritual_time, ritual_time_proposed, ritual_time_proposed_by, dark_opened_at",
        )
        .eq("id", couple.coupleId)
        .single(),
      admin
        .from("couple_members")
        .select("user_id, role, allow_saved_spicy")
        .eq("couple_id", couple.coupleId),
      admin
        .from("dark_settings")
        .select("user_id, opted_in_at")
        .in("user_id", [user.id, couple.partnerId]),
      admin.from("user_private").select("user_id, dob").in("user_id", [user.id, couple.partnerId]),
    ]);
  const meRow = people!.find((p) => p.id === user.id)!;
  const pRow = people!.find((p) => p.id === couple.partnerId)!;
  const toPerson = async (p: typeof meRow, role: "a" | "b"): Promise<Person> => ({
    id: p.id,
    name: p.display_name ?? "You",
    role,
    avatarIcon: (toMemoji(p.avatar_icon) ?? DEFAULT_AVATAR) as Person["avatarIcon"],
    avatarUrl: p.avatar_kind === "photo" ? await avatarUrl(p.avatar_path) : null,
    city: p.home_city ?? "",
    country: p.country ?? "",
    timezone: p.timezone,
    lat: p.latitude === null ? null : Number(p.latitude),
    lon: p.longitude === null ? null : Number(p.longitude),
    nickname: p.partner_nickname,
    phone: p.phone,
    bio: p.bio,
    loveLanguage: p.love_language,
    shareBirthday: p.share_birthday,
    // Day and month only, and only when they chose to share it (or it's you).
    birthday:
      p.share_birthday || p.id === user.id
        ? (dobs?.find((d) => d.user_id === p.id)?.dob?.slice(5, 10) ?? null)
        : null,
  });
  const roleOf = (id: string) => (members!.find((m) => m.user_id === id)?.role ?? "a") as "a" | "b";
  const darkBoth = (dark ?? []).filter((d) => d.opted_in_at).length === 2;
  const [me, partner] = await Promise.all([
    toPerson(meRow, roleOf(user.id)),
    toPerson(pRow, roleOf(couple.partnerId)),
  ]);
  return {
    solo: false,
    coupleId: couple.coupleId,
    me,
    partner,
    startedOn: c?.started_on ?? null,
    chatTheme: c?.chat_theme ?? "clink",
    chatWallpaper: c?.chat_wallpaper ?? "none",
    chatWallpaperMedia: c?.chat_wallpaper_media ?? null,
    chatWallpaperBlur: c?.chat_wallpaper_blur ?? false,
    linkedAt: c!.linked_at,
    ritualTime: c?.ritual_time?.slice(0, 5) ?? "21:00",
    ritualProposal: c?.ritual_time_proposed
      ? { time: c.ritual_time_proposed.slice(0, 5), byMe: c.ritual_time_proposed_by === user.id }
      : null,
    // Owner decision: the After Dark entry shows for every couple. Opening it
    // still needs your own 18+ setup, PIN and tiers, and content needs you both.
    darkVisible: true,
    darkBoth,
    discreet: meRow.discreet_mode,
    appLock,
    renderedAt: Date.now(),
    isAdmin: meRow.is_admin,
    email: user.email ?? null,
    settings: {
      appIcon: meRow.app_icon,
      notify: meRow.notify as Record<string, boolean>,
      quietStart: meRow.quiet_start.slice(0, 5),
      quietEnd: meRow.quiet_end.slice(0, 5),
      allowSavedSpicyMine: Boolean(members!.find((m) => m.user_id === user.id)?.allow_saved_spicy),
      allowSavedSpicyBoth: (members ?? []).every((m) => m.allow_saved_spicy),
    },
  };
}

/** The app for someone who hasn't linked yet: their own profile, a placeholder partner. */
async function soloContext(
  userId: string,
  email: string | null,
  appLock: boolean,
  cols: string,
): Promise<CoupleContextValue> {
  const admin = supabaseAdmin();
  const [{ data: p }, { data: priv }] = await Promise.all([
    admin.from("profiles").select(cols).eq("id", userId).single(),
    admin.from("user_private").select("dob").eq("user_id", userId).maybeSingle(),
  ]);
  const row = p as unknown as {
    display_name: string | null;
    avatar_kind: string;
    avatar_icon: string | null;
    avatar_path: string | null;
    home_city: string | null;
    country: string | null;
    timezone: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    discreet_mode: boolean;
    app_icon: string;
    notify: Record<string, boolean>;
    quiet_start: string;
    quiet_end: string;
    is_admin: boolean;
    bio: string | null;
    love_language: string | null;
    share_birthday: boolean;
  };
  const me: Person = {
    id: userId,
    name: row.display_name ?? "You",
    role: "a",
    avatarIcon: (toMemoji(row.avatar_icon) ?? DEFAULT_AVATAR) as Person["avatarIcon"],
    avatarUrl: row.avatar_kind === "photo" ? await avatarUrl(row.avatar_path) : null,
    city: row.home_city ?? "",
    country: row.country ?? "",
    timezone: row.timezone,
    lat: row.latitude === null ? null : Number(row.latitude),
    lon: row.longitude === null ? null : Number(row.longitude),
    nickname: null,
    phone: row.phone,
    bio: row.bio,
    loveLanguage: row.love_language,
    shareBirthday: row.share_birthday,
    birthday: priv?.dob?.slice(5, 10) ?? null,
  };
  const partner: Person = {
    ...me,
    id: "",
    name: "Your partner",
    role: "b",
    avatarIcon: DEFAULT_AVATAR as Person["avatarIcon"],
    avatarUrl: null,
    city: "",
    country: "",
    lat: null,
    lon: null,
    phone: null,
    bio: null,
    loveLanguage: null,
    birthday: null,
  };
  return {
    solo: true,
    coupleId: "",
    me,
    partner,
    startedOn: null,
    chatTheme: "clink",
    chatWallpaper: "none",
    chatWallpaperMedia: null,
    chatWallpaperBlur: false,
    linkedAt: new Date().toISOString(),
    ritualTime: "21:00",
    ritualProposal: null,
    darkVisible: false,
    darkBoth: false,
    discreet: row.discreet_mode,
    appLock,
    renderedAt: Date.now(),
    isAdmin: row.is_admin,
    email,
    settings: {
      appIcon: row.app_icon,
      notify: row.notify,
      quietStart: row.quiet_start.slice(0, 5),
      quietEnd: row.quiet_end.slice(0, 5),
      allowSavedSpicyMine: false,
      allowSavedSpicyBoth: false,
    },
  };
}
