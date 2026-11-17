"use client";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { formatClock, isNight } from "@/lib/time";
import type { Person } from "@/features/couple/types";

const noop = () => () => {};
/** False during server render and hydration, true after: browser-only data waits for it. */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * Today's weather where this person is. Cached in the browser, so it's held
 * back until after hydration (the server never has it; showing it on the first
 * render would mismatch the server HTML).
 */
export function useWeather(p: Person) {
  const hydrated = useHydrated();
  const q = useQuery({
    queryKey: ["weather", p.lat, p.lon],
    enabled: p.lat !== null && p.lon !== null,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const r = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}`);
      return (await r.json()) as { temp: number | null; label: string | null };
    },
  });
  return hydrated ? q : { ...q, data: undefined };
}

function Half({ p, now, side }: { p: Person; now: Date; side: "me" | "partner" }) {
  const night = isNight(now, p.timezone);
  const w = useWeather(p).data;
  const Icon = night ? Moon : Sun;
  const right = side === "partner";
  return (
    <div
      className={right ? "border-line border-l p-4 text-right lg:p-6" : "p-4 lg:p-6"}
      style={{
        background: night ? "var(--bg-night)" : right ? "var(--surface-2)" : "var(--surface-1)",
        transition: "background 600ms ease",
      }}
    >
      <div
        className={`text-muted flex items-center gap-1.5 text-sm font-medium ${right ? "justify-end" : ""}`}
      >
        {!right && <Icon size={16} aria-label={night ? "Night" : "Day"} />}
        <span className="truncate">
          {p.city || p.timezone.split("/").pop()?.replace(/_/g, " ")}
        </span>
        {right && <Icon size={16} aria-label={night ? "Night" : "Day"} />}
      </div>
      <div className="mono mt-1 text-[36px] leading-[1.2] lg:text-[48px] 2xl:text-[64px]">
        <time dateTime={now.toISOString()}>{formatClock(now, p.timezone)}</time>
      </div>
      <div className="text-faint text-sm">{w?.temp != null ? `${w.temp}° · ${w.label}` : " "}</div>
    </div>
  );
}

/** HOME-06: both local times and weather, with "their night" shading. */
export function DualClock({ now }: { now: Date }) {
  const { me, partner } = useCouple();
  return (
    <div
      role="group"
      className="border-line rounded-card grid flex-none grid-cols-2 overflow-hidden border"
      aria-label="Your clocks"
    >
      <Half p={me} now={now} side="me" />
      <Half p={partner} now={now} side="partner" />
    </div>
  );
}
