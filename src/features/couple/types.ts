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
}

export interface CoupleContextValue {
  coupleId: string;
  me: Person;
  partner: Person;
  startedOn: string | null;
  linkedAt: string;
  ritualTime: string;
  ritualProposal: { time: string; byMe: boolean } | null;
  darkVisible: boolean;
  discreet: boolean;
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

export type PresenceStatus = "free" | "studying" | "cooking" | "working" | "sleeping" | "away";

export interface PartnerPresence {
  online: boolean;
  status: PresenceStatus;
  lastSeen: string | null;
}
