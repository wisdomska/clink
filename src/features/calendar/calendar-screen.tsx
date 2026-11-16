"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  CaretLeft,
  CaretRight,
  Ticket,
  Hourglass,
  Wine,
  Cake,
  Plus,
  CheckCircle,
} from "@phosphor-icons/react";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Display } from "@/components/ui/heading";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { haptic } from "@/lib/feedback";
import { localParts, wallTime, zonedToUtc } from "@/lib/time";
import { useKits } from "@/features/plans/data";
import {
  addDays,
  inMonth,
  isDayKey,
  keyOf,
  monthGrid,
  monthOf,
  parseKey,
  shiftMonth,
  weekdayOf,
  type MonthRef,
} from "./calendar-math";
import { monthKey, useCalendarEvents, type CalEvent, type EventKind, type MonthData } from "./data";
import { TimeField } from "@/components/ui/pickers";

const KIND: Record<EventKind, { label: string; Icon: typeof Ticket; dot: string }> = {
  date: { label: "Date", Icon: Ticket, dot: "bg-accent" },
  countdown: { label: "Countdown", Icon: Hourglass, dot: "bg-[var(--champagne)]" },
  anniversary: { label: "Anniversary", Icon: Wine, dot: "bg-[var(--blush)]" },
  birthday: { label: "Birthday", Icon: Cake, dot: "bg-[var(--lilac)]" },
};

const WEEKDAYS = [
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
  ["S", "Sunday"],
] as const;

/** Format a day key without time-zone drift (it's already a local day). */
function fmtDay(key: string, opts: Intl.DateTimeFormatOptions) {
  const { y, m, d } = parseKey(key);
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m, d)),
  );
}

function monthLabel(ref: MonthRef) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ref.y, ref.m, 1)));
}

/** Shared calendar: month grid plus an agenda of dates, countdowns, anniversaries and birthdays. */
export function CalendarScreen() {
  const { me } = useCouple();
  const router = useRouter();
  const params = useSearchParams();
  const now = useCoupleNow(60_000);
  const today = localParts(now, me.timezone).dateKey;
  const [selected, setSelected] = useState(() => {
    const d = params.get("d");
    return isDayKey(d) ? d : today;
  });
  const [ref, setRef] = useState<MonthRef>(() => monthOf(selected));
  const [adding, setAdding] = useState(false);
  const gridRef = useRef<HTMLTableElement>(null);
  const { events, isLoading, isError } = useCalendarEvents(ref);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const grid = monthGrid(ref);
  const weeks = Array.from({ length: 6 }, (_, w) => grid.slice(w * 7, w * 7 + 7));
  const dayEvents = byDay.get(selected) ?? [];
  const monthEvents = events.filter((e) => inMonth(e.day, ref));
  const past = selected < today;

  function select(key: string, focus = false) {
    setSelected(key);
    const next = monthOf(key);
    if (next.y !== ref.y || next.m !== ref.m) setRef(next);
    router.replace(`/calendar?d=${key}`, { scroll: false });
    if (focus)
      requestAnimationFrame(() =>
        gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${key}"]`)?.focus(),
      );
  }

  function moveMonth(n: number) {
    const next = shiftMonth(ref, n);
    setRef(next);
    haptic("select");
    // Keep the same day number where it exists, so the selection follows along.
    const lastDay = parseKey(keyOf(next.y, next.m + 1, 0)).d;
    select(keyOf(next.y, next.m, Math.min(parseKey(selected).d, lastDay)));
  }

  function onGridKey(e: React.KeyboardEvent) {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (e.key in step) {
      e.preventDefault();
      select(addDays(selected, step[e.key]!), true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const wd = weekdayOf(selected);
      select(addDays(selected, e.key === "Home" ? -wd : 6 - wd), true);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      moveMonth(e.key === "PageUp" ? -1 : 1);
    }
  }

  return (
    <main className="screen an-screen flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Display size={48} className="mt-2">
          Calendar
        </Display>
        <Button variant="ghost" size="sm" onClick={() => select(today, true)}>
          Today
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
        <section aria-labelledby="cal-month" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 id="cal-month" className="m-0 flex-1 text-lg font-bold" aria-live="polite">
              {monthLabel(ref)}
            </h2>
            <IconButton label="Previous month" onClick={() => moveMonth(-1)}>
              <CaretLeft size={18} />
            </IconButton>
            <IconButton label="Next month" onClick={() => moveMonth(1)}>
              <CaretRight size={18} />
            </IconButton>
          </div>

          <div className="rounded-card border-line bg-s1 border p-2 sm:p-3">
            <table
              ref={gridRef}
              role="grid"
              aria-labelledby="cal-month"
              aria-busy={isLoading || undefined}
              className="w-full table-fixed border-collapse"
              onKeyDown={onGridKey}
            >
              <thead>
                <tr>
                  {WEEKDAYS.map(([short, long], i) => (
                    <th
                      key={i}
                      scope="col"
                      abbr={long}
                      className="text-faint pb-1 text-center text-xs font-medium"
                    >
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, w) => (
                  <tr key={w}>
                    {week.map((key) => {
                      const evs = byDay.get(key) ?? [];
                      const isSel = key === selected;
                      const isToday = key === today;
                      const other = !inMonth(key, ref);
                      return (
                        <td key={key} className="p-0.5 text-center">
                          <button
                            type="button"
                            data-day={key}
                            tabIndex={isSel ? 0 : -1}
                            aria-pressed={isSel}
                            aria-current={isToday ? "date" : undefined}
                            aria-label={`${fmtDay(key, { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", today" : ""}${
                              evs.length
                                ? `, ${evs.length} event${evs.length === 1 ? "" : "s"}: ${evs.map((e) => e.title).join(", ")}`
                                : ""
                            }`}
                            onClick={() => select(key)}
                            className={cn(
                              "relative flex h-12 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors sm:h-14",
                              isSel
                                ? "bg-accent text-on-accent border-transparent font-bold"
                                : isToday
                                  ? "border-accent text-text bg-transparent font-bold"
                                  : "hover:bg-s2 border-transparent bg-transparent",
                              !isSel && other && "text-faint",
                            )}
                          >
                            <span className="mono leading-none">{parseKey(key).d}</span>
                            <span aria-hidden className="flex h-1.5 items-center gap-0.5">
                              {evs.slice(0, 3).map((e) => (
                                <span
                                  key={e.id}
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    isSel ? "bg-on-accent" : KIND[e.kind].dot,
                                  )}
                                />
                              ))}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul
            className="text-muted m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs"
            aria-label="Key"
          >
            {(Object.keys(KIND) as EventKind[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("h-2 w-2 rounded-full", KIND[k].dot)} />
                {KIND[k].label}
              </li>
            ))}
          </ul>
          {isError && (
            <p role="alert" className="text-danger m-0 text-sm">
              Couldn&apos;t load this month. Check your connection.
            </p>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="cal-day" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="cal-day" className="m-0 text-lg font-bold">
                {selected === today
                  ? "Today"
                  : fmtDay(selected, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              {!past && (
                <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
                  <Plus size={16} weight="bold" aria-hidden />
                  Plan a date
                </Button>
              )}
            </div>
            {dayEvents.length ? (
              <EventList events={dayEvents} />
            ) : (
              <p className="text-muted m-0 text-sm">
                {past
                  ? "Nothing on this day."
                  : "Nothing planned yet. Tap Plan a date to book one."}
              </p>
            )}
          </section>

          <section aria-labelledby="cal-agenda" className="flex flex-col gap-3">
            <h2 id="cal-agenda" className="m-0 text-lg font-bold">
              {fmtDay(`${ref.y}-${String(ref.m + 1).padStart(2, "0")}-01`, { month: "long" })} at a
              glance
            </h2>
            {isLoading ? (
              <div className="flex flex-col gap-2" role="status" aria-label="Loading">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="an-skel bg-s2 rounded-input h-14" />
                ))}
              </div>
            ) : monthEvents.length ? (
              <ol className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
                {monthEvents.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => select(e.day)}
                      className={cn(
                        "hover:bg-s2 flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-2 text-left",
                        e.day < today && "opacity-70",
                      )}
                    >
                      <span className="flex w-10 flex-none flex-col items-center">
                        <span className="text-faint text-[11px]">
                          {fmtDay(e.day, { weekday: "short" })}
                        </span>
                        <span className="mono text-text text-base leading-none font-bold">
                          {parseKey(e.day).d}
                        </span>
                      </span>
                      <EventLine e={e} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted m-0 text-sm">
                A quiet month.{" "}
                <Link href="/plans" className="text-accent font-semibold">
                  Find a date kit
                </Link>
              </p>
            )}
          </section>
        </div>
      </div>

      <AddDateSheet day={selected} open={adding} onOpenChange={setAdding} monthRef={ref} />
    </main>
  );
}

function EventLine({ e }: { e: CalEvent }) {
  const { Icon, label } = KIND[e.kind];
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Icon size={20} className="text-muted flex-none" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-text truncate text-sm font-semibold">{e.title}</span>
        <span className="text-faint text-xs">
          {label}
          {e.time ? ` · ${e.time}` : ""}
          {e.done ? " · done" : ""}
          {e.pending ? " · saving" : ""}
        </span>
      </span>
      {e.done && (
        <CheckCircle size={18} weight="fill" className="text-accent flex-none" aria-hidden />
      )}
    </span>
  );
}

function EventList({ events }: { events: CalEvent[] }) {
  return (
    <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
      {events.map((e) => (
        <li key={e.id}>
          {e.href ? (
            <Link
              href={e.href}
              className="hover:bg-s2 text-text hover:text-text flex min-h-14 items-center px-4 py-2"
            >
              <EventLine e={e} />
            </Link>
          ) : (
            <div className="flex min-h-14 items-center px-4 py-2">
              <EventLine e={e} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Book a date kit on the chosen day, through the same API Plans uses. Optimistic. */
function AddDateSheet({
  day,
  open,
  onOpenChange,
  monthRef,
}: {
  day: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  monthRef: MonthRef;
}) {
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const { data: kits = [], isLoading } = useKits();
  const now = useCoupleNow(15_000);
  const [kitId, setKitId] = useState<string | null>(null);
  const [time, setTime] = useState("20:00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = kits.find((k) => k.id === kitId) ?? kits[0];
  const instant = time ? zonedToUtc(day, time, me.timezone) : null;

  async function book() {
    setError(null);
    if (!chosen || !instant) return setError("Pick a kit and a time.");
    if (instant.getTime() < now.getTime()) return setError("Pick a time in the future.");
    setBusy(true);
    const key = monthKey(coupleId, monthRef);
    const prev = qc.getQueryData<MonthData>(key);
    const temp = `pending-${crypto.randomUUID()}`;
    qc.setQueryData<MonthData>(key, (old) => ({
      dates: [
        ...(old?.dates ?? []),
        {
          id: temp,
          kit_id: chosen.id,
          start_at: instant.toISOString(),
          status: "scheduled",
          title: chosen.title,
          pending: true,
        },
      ],
      countdowns: old?.countdowns ?? [],
    }));
    onOpenChange(false);
    const r = await fetch("/api/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kitId: chosen.id, startAt: instant.toISOString() }),
    });
    setBusy(false);
    if (!r.ok) {
      qc.setQueryData(key, prev);
      const msg = (await r.json().catch(() => ({}))).message ?? "That didn't book. Try again.";
      toast.err(msg);
      setError(msg);
      onOpenChange(true);
      return;
    }
    haptic("select");
    toast(`${chosen.title} booked. Reminders set in both time zones.`);
    void qc.invalidateQueries({ queryKey: ["calendar", coupleId] });
    void qc.invalidateQueries({ queryKey: ["dates", coupleId] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Plan a date" handle>
      <Display as="h2" size={28}>
        Plan a date
      </Display>
      <p className="text-muted m-0 text-sm">
        {fmtDay(day, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="text-muted mb-1.5 text-sm font-medium">Date kit</legend>
        {isLoading ? (
          <div className="an-skel bg-s2 rounded-input h-14" />
        ) : (
          <div className="rounded-card border-line bg-s2 divide-line flex max-h-[38dvh] flex-col divide-y overflow-y-auto border">
            {kits.map((k) => {
              const on = chosen?.id === k.id;
              return (
                <label
                  key={k.id}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2",
                    on && "bg-accent/10",
                  )}
                >
                  <input
                    type="radio"
                    name="kit"
                    value={k.id}
                    checked={on}
                    onChange={() => setKitId(k.id)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-text truncate text-sm font-semibold">{k.title}</span>
                    <span className="text-faint text-xs">{k.minutes} min</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <div>
        <Label htmlFor="cal-time">Your time</Label>
        <TimeField id="cal-time" value={time} onChange={setTime} />
      </div>
      {instant && (
        <p className="text-muted m-0 text-sm">
          That&apos;s {wallTime(instant, partner.timezone, true)} for {partner.name}.
        </p>
      )}
      <FieldError>{error}</FieldError>
      <Button onClick={() => void book()} loading={busy} disabled={!chosen}>
        Book it
      </Button>
    </Sheet>
  );
}
