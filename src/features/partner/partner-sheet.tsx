"use client";
import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Cake,
  ChatCircle,
  Clock,
  Heart,
  MapPin,
  Phone,
  VideoCamera,
  Wine,
  NavigationArrow,
} from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { statusLabel } from "@/features/couple/types";
import { useCall } from "@/features/call/call-provider";
import { useWeather } from "@/features/home/dual-clock";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time";
import { cn } from "@/components/ui/cn";
import { moodChip } from "@/features/home/mood-card";

export const LOVE_LANGUAGES: Record<string, string> = {
  words: "Words of affirmation",
  touch: "Physical touch",
  time: "Quality time",
  gifts: "Receiving gifts",
  acts: "Acts of service",
};

const Ctx = createContext<() => void>(() => undefined);
/** Open your partner's profile from anywhere. */
export const useOpenPartner = () => useContext(Ctx);

function km(
  a: { lat: number | null; lon: number | null },
  b: { lat: number | null; lon: number | null },
) {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function birthdayLabel(mmdd: string) {
  const [m, d] = mmdd.split("-").map(Number);
  return new Date(2000, (m ?? 1) - 1, d ?? 1).toLocaleDateString([], {
    day: "numeric",
    month: "long",
  });
}

function daysUntil(mmdd: string, now: Date) {
  const [m, d] = mmdd.split("-").map(Number);
  let next = new Date(now.getFullYear(), (m ?? 1) - 1, d ?? 1);
  if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
    next = new Date(now.getFullYear() + 1, (m ?? 1) - 1, d ?? 1);
  return Math.round(
    (next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-s2 flex flex-col gap-1 rounded-[14px] p-3">
      <span className="text-muted flex items-center gap-1.5 text-xs font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[15px] leading-tight font-semibold">{value}</span>
    </div>
  );
}

/** Your partner, at a glance: where they are, how they are, and one tap to reach them. */
export function PartnerSheetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPartner = useCallback(() => setOpen(true), []);
  const { me, partner, presence, coupleId, startedOn, linkedAt } = useCouple();
  const now = useCoupleNow(30_000);
  const router = useRouter();
  const { start } = useCall();
  const weather = useWeather(partner).data;
  const { data: mood } = useQuery({
    // Not keyed on `open`: the last answer shows instantly on every reopen
    // while a fresh one loads behind it.
    queryKey: ["partner-mood", coupleId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("moods")
        .select("mood, note, created_at")
        .eq("user_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const dist = km(me, partner);
  const together = Math.max(
    0,
    Math.floor((now.getTime() - new Date(startedOn ?? linkedAt).getTime()) / 86_400_000),
  );
  const online = presence.online;

  return (
    <Ctx.Provider value={openPartner}>
      {children}
      <Sheet open={open} onOpenChange={setOpen} title={`${partner.name}'s profile`} handle>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="relative">
            <Avatar
              name={partner.name}
              side="partner"
              size={112}
              photoUrl={partner.avatarUrl}
              icon={partner.avatarIcon}
            />
            {online && (
              <span
                aria-hidden
                className="bg-online absolute right-2 bottom-2 h-5 w-5 rounded-full shadow-[0_0_0_4px_var(--surface-1)]"
              />
            )}
          </div>
          <div className="display text-[30px] leading-none">{partner.name}</div>
          {me.nickname && (
            <div className="text-muted text-sm">You call them &ldquo;{me.nickname}&rdquo;</div>
          )}
          <div className="flex flex-wrap justify-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                online ? "bg-online/15 text-[var(--online)]" : "bg-s2 text-muted",
              )}
            >
              {online ? statusLabel(presence.status).replace(/^./, (c) => c.toUpperCase()) : "Away"}
            </span>
            {mood && (
              <span className="bg-s2 rounded-full px-3 py-1 text-xs font-semibold">
                {moodChip(mood.mood)}
              </span>
            )}
          </div>
          {partner.bio && (
            <p className="text-muted m-0 max-w-[34ch] text-sm leading-snug">{partner.bio}</p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "Message",
              icon: <ChatCircle size={22} weight="fill" />,
              onClick: () => router.push("/chat"),
            },
            { label: "Call", icon: <Phone size={22} weight="fill" />, onClick: () => start(false) },
            {
              label: "Video",
              icon: <VideoCamera size={22} weight="fill" />,
              onClick: () => start(true),
            },
            {
              label: "Clink",
              icon: <Wine size={22} weight="fill" />,
              onClick: () => router.push("/us"),
            },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className="press bg-s2 text-text flex cursor-pointer flex-col items-center gap-1 rounded-[14px] border-0 py-3 text-xs font-semibold"
            >
              <span className="text-accent">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Fact
            icon={<Clock size={14} />}
            label="Their time"
            value={`${formatClock(now, partner.timezone)}${weather?.temp != null ? ` · ${Math.round(weather.temp)}°` : ""}`}
          />
          <Fact
            icon={<MapPin size={14} />}
            label="Home"
            value={[partner.city, partner.country].filter(Boolean).join(", ") || "Not set"}
          />
          <Fact
            icon={<NavigationArrow size={14} />}
            label="Between you"
            value={
              dist == null ? "Unknown" : dist < 1 ? "Same place" : `${dist.toLocaleString()} km`
            }
          />
          <Fact
            icon={<Heart size={14} />}
            label="Together"
            value={`${together.toLocaleString()} ${together === 1 ? "day" : "days"}`}
          />
          {partner.loveLanguage && (
            <Fact
              icon={<Heart size={14} weight="fill" />}
              label="Love language"
              value={LOVE_LANGUAGES[partner.loveLanguage] ?? partner.loveLanguage}
            />
          )}
          {partner.birthday && (
            <Fact
              icon={<Cake size={14} />}
              label="Birthday"
              value={`${birthdayLabel(partner.birthday)}${(() => {
                const n = daysUntil(partner.birthday!, now);
                return n === 0
                  ? " · today!"
                  : n === 1
                    ? " · tomorrow"
                    : n <= 30
                      ? ` · in ${n} days`
                      : "";
              })()}`}
            />
          )}
        </div>
        {mood?.note && (
          <div className="bg-s2 text-muted rounded-[14px] p-3 text-sm">
            Latest mood note: &ldquo;{mood.note}&rdquo;
          </div>
        )}
        <Link
          href="/settings"
          prefetch
          onClick={() => setOpen(false)}
          className="text-muted hover:text-text flex h-11 items-center justify-center text-sm"
        >
          Edit your own profile
        </Link>
      </Sheet>
    </Ctx.Provider>
  );
}
