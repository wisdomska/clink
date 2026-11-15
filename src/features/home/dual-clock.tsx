"use client";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { formatClock, isNight } from "@/lib/time";
import type { Person } from "@/features/couple/types";

function useWeather(p: Person) {
  return useQuery({
    queryKey: ["weather", p.lat, p.lon],
    enabled: p.lat !== null && p.lon !== null,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const r = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}`);
      return (await r.json()) as { temp: number | null; label: string | null };
    },
  });
}

function Half({ p, now, side }: { p: Person; now: Date; side: "me" | "partner" }) {
  const night = isNight(now, p.timezone);
  const w = useWeather(p).data;
  const Icon = night ? Moon : Sun;
  const right = side === "partner";
  return (
    <div
      className={right ? "border-line border-l p-4 text-right" : "p-4"}
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
      <div className="mono mt-1 text-[36px] leading-[1.2]">
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
      className="border-line grid flex-none grid-cols-2 overflow-hidden rounded-[28px] border"
      aria-label="Your clocks"
    >
      <Half p={me} now={now} side="me" />
      <Half p={partner} now={now} side="partner" />
    </div>
  );
}
