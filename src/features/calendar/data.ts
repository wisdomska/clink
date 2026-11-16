"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { localParts, wallTime, zonedToUtc } from "@/lib/time";
import { addDays, isYearlyOn, monthGrid, yearsSince, type MonthRef } from "./calendar-math";

export type EventKind = "date" | "countdown" | "anniversary" | "birthday";

export interface CalEvent {
  id: string;
  kind: EventKind;
  /** Day key in your own time zone. */
  day: string;
  title: string;
  /** Your local time, when it has one. */
  time?: string;
  href?: string;
  done?: boolean;
  /** Added optimistically, not confirmed yet. */
  pending?: boolean;
}

export interface MonthData {
  dates: Array<{
    id: string;
    kit_id: string;
    start_at: string;
    status: string;
    title: string;
    pending?: boolean;
  }>;
  countdowns: Array<{ id: string; title: string; subtitle: string | null; target_at: string }>;
}

export const monthKey = (coupleId: string, ref: MonthRef) => [
  "calendar",
  coupleId,
  `${ref.y}-${ref.m}`,
];

/** Dates and countdowns for the 6-week grid around a month, read under RLS. */
export function useMonth(ref: MonthRef) {
  const { coupleId, me } = useCouple();
  return useQuery({
    queryKey: monthKey(coupleId, ref),
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<MonthData> => {
      const grid = monthGrid(ref);
      const from = zonedToUtc(grid[0]!, "00:00", me.timezone).toISOString();
      const to = zonedToUtc(addDays(grid[41]!, 1), "00:00", me.timezone).toISOString();
      const sb = supabaseBrowser();
      const [dates, countdowns] = await Promise.all([
        sb
          .from("scheduled_dates")
          .select("id, kit_id, start_at, status, date_kits(title)")
          .eq("couple_id", coupleId)
          .neq("status", "cancelled")
          .gte("start_at", from)
          .lt("start_at", to)
          .order("start_at"),
        sb
          .from("countdowns_public")
          .select("id, title, subtitle, target_at")
          .eq("couple_id", coupleId)
          .gte("target_at", from)
          .lt("target_at", to)
          .order("target_at"),
      ]);
      if (dates.error) throw dates.error;
      return {
        dates: (dates.data ?? []).map((d) => ({
          id: d.id,
          kit_id: d.kit_id,
          start_at: d.start_at,
          status: d.status,
          title: (d.date_kits as unknown as { title: string } | null)?.title ?? "Date night",
        })),
        countdowns: (countdowns.data ?? []).flatMap((c) =>
          c.id && c.target_at
            ? [
                {
                  id: c.id,
                  title: c.title ?? "Countdown",
                  subtitle: c.subtitle,
                  target_at: c.target_at,
                },
              ]
            : [],
        ),
      };
    },
  });
}

/**
 * Everything on the calendar for one month grid: booked dates, countdowns, the
 * day you got together, and birthdays (your partner's only if they share it).
 */
export function useCalendarEvents(ref: MonthRef) {
  const { me, partner, startedOn } = useCouple();
  const q = useMonth(ref);
  const events = useMemo(() => {
    const tz = me.timezone;
    const out: CalEvent[] = [];
    for (const d of q.data?.dates ?? []) {
      const at = new Date(d.start_at);
      out.push({
        id: `date-${d.id}`,
        kind: "date",
        day: localParts(at, tz).dateKey,
        title: d.title,
        time: wallTime(at, tz),
        href: d.pending ? undefined : `/plans/kits/${d.kit_id}`,
        done: d.status === "completed",
        pending: d.pending,
      });
    }
    for (const c of q.data?.countdowns ?? []) {
      const at = new Date(c.target_at);
      out.push({
        id: `countdown-${c.id}`,
        kind: "countdown",
        day: localParts(at, tz).dateKey,
        title: c.subtitle ? `${c.title}, ${c.subtitle}` : c.title,
        time: wallTime(at, tz),
        href: "/us",
      });
    }
    for (const day of monthGrid(ref)) {
      if (startedOn && day > startedOn && isYearlyOn(startedOn.slice(5), day)) {
        const n = yearsSince(startedOn, day);
        out.push({
          id: `anniversary-${day}`,
          kind: "anniversary",
          day,
          title: `${n} year${n === 1 ? "" : "s"} together`,
        });
      }
      if (me.birthday && isYearlyOn(me.birthday, day))
        out.push({ id: `bday-me-${day}`, kind: "birthday", day, title: "Your birthday" });
      if (partner.birthday && isYearlyOn(partner.birthday, day))
        out.push({
          id: `bday-partner-${day}`,
          kind: "birthday",
          day,
          title: `${partner.name}'s birthday`,
        });
    }
    return out.sort((a, b) =>
      a.day === b.day ? (a.time ?? "").localeCompare(b.time ?? "") : a.day.localeCompare(b.day),
    );
  }, [q.data, ref, me.timezone, me.birthday, partner.birthday, partner.name, startedOn]);
  return { ...q, events };
}
