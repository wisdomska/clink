import type { AvatarIcon } from "@/components/ui/avatar";

export interface Person {
  id: string;
  name: string;
  role: "a" | "b";
  avatarIcon: AvatarIcon;
  avatarUrl: string | null;
  city: string;
  country: string;
  timezone: string;
  lat: number | null;
  lon: number | null;
  nickname: string | null;
  phone: string | null;
  bio: string | null;
  loveLanguage: string | null;
  shareBirthday: boolean;
  /** "MM-DD", when shared. */
  birthday: string | null;
  /** Picks which avatar cast to offer. Your own only; null for your partner. */
  gender?: "woman" | "man" | "unspecified" | null;
}

export interface CoupleContextValue {
  /** Signed in and set up, but not linked with anyone yet. partner is a placeholder. */
  solo: boolean;
  coupleId: string;
  me: Person;
  partner: Person;
  startedOn: string | null;
  linkedAt: string;
  ritualTime: string;
  ritualProposal: { time: string; byMe: boolean } | null;
  darkVisible: boolean;
  chatTheme: string;
  chatWallpaper: string;
  chatWallpaperMedia: string | null;
  chatWallpaperBlur: boolean;
  /** Both partners have set up After Dark. */
  darkBoth: boolean;
  discreet: boolean;
  appLock: boolean;
  /** Server render time (ms). Clocks start here so hydration matches the server HTML. */
  renderedAt: number;
  isAdmin: boolean;
  email: string | null;
  settings: {
    appIcon: string;
    notify: Record<string, boolean>;
    quietStart: string;
    quietEnd: string;
    allowSavedSpicyMine: boolean;
    allowSavedSpicyBoth: boolean;
  };
}

export type PresenceStatus =
  "free" | "studying" | "cooking" | "working" | "sleeping" | "away" | `custom:${string}`;

/** What a status reads as: presets as-is, your own words for custom ones. */
export function statusLabel(s: PresenceStatus | string): string {
  return s.startsWith("custom:") ? s.slice(7) : s;
}

export interface PartnerPresence {
  online: boolean;
  status: PresenceStatus;
  lastSeen: string | null;
}
