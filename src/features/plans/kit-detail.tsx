"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MusicNotes, CheckCircle } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead, Mono } from "@/components/ui/heading";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { zonedToUtc, wallTime, localParts } from "@/lib/time";
import { useKits, useUpcomingDates } from "./data";

export function ScheduleSheet({
  kitId,
  title,
  open,
  onOpenChange,
}: {
  kitId: string;
  title: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const [date, setDate] = useState(
    () => localParts(new Date(Date.now() + 86400000), me.timezone).dateKey,
  );
  const [time, setTime] = useState("21:00");
  const [error, setError] = useState<string | null>(null);
  const instant = date && time ? zonedToUtc(date, time, me.timezone) : null;
  const theirs = instant ? `${wallTime(instant, partner.timezone, true)} for ${partner.name}` : "";
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Schedule ${title}`} handle>
      <Display as="h2" size={28}>
        When&apos;s {title.toLowerCase()}?
      </Display>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <div>
          <Label htmlFor="sd">Date</Label>
          <Input
            id="sd"
            type="date"
            min={localParts(new Date(), me.timezone).dateKey}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="st">Your time</Label>
          <Input id="st" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      {instant && <Mono className="text-muted text-sm">THAT&apos;S {theirs.toUpperCase()}</Mono>}
      <p className="text-faint m-0 text-sm">
        You both get reminders 1 day and 1 hour before, in your own time.
      </p>
      <FieldError>{error}</FieldError>
      <Button
        onClick={async () => {
          setError(null);
          if (!instant) return;
          const r = await fetch("/api/dates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kitId, startAt: instant.toISOString() }),
          });
          const d = await r.json();
          if (!r.ok) return setError(d.message);
          onOpenChange(false);
          toast(`${title} scheduled. Reminders set in both time zones.`);
          void qc.invalidateQueries({ queryKey: ["dates", coupleId] });
        }}
      >
        Book it
      </Button>
    </Sheet>
  );
}

export function KitDetail({ id }: { id: string }) {
  const router = useRouter();
  const { me, partner } = useCouple();
  const { data: kits = [] } = useKits();
  const { data: dates = [] } = useUpcomingDates();
  const kit = kits.find((k) => k.id === id);
  const booked = dates.find((d) => d.kit_id === id && d.status !== "completed");
  const done = dates.find((d) => d.kit_id === id && d.status === "completed");
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);
  const [now] = useState(() => Date.now());
  if (!kit) return <div className="screen an-skel rounded-card bg-s2 h-64" />;
  const steps = kit.steps as string[];
  const prompts = kit.prompts as string[];
  const inProgress = booked && new Date(booked.start_at).getTime() <= now;
  return (
    <div className="screen an-screen flex max-w-[760px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/plans")}>
        <ArrowLeft size={20} />
      </IconButton>
      <div>
        <Mono className="text-muted">
          {kit.minutes >= 120 && kit.minutes % 60 === 0
            ? `${kit.minutes / 60} h`
            : `${kit.minutes} min`}{" "}
          · Admit 2
        </Mono>
        <Display size={48} className="mt-1">
          {kit.title}
        </Display>
        <Lead className="mt-2">{kit.blurb}</Lead>
      </div>
      {done && !booked ? (
        <div className="text-accent flex items-center gap-2 text-base font-medium">
          <CheckCircle size={22} aria-hidden /> You did this one. It&apos;s on your timeline.
        </div>
      ) : booked ? (
        <div className="rounded-card border-line bg-s1 flex flex-col gap-1 border p-4">
          <div className="text-muted text-sm font-medium">
            {inProgress ? "Happening now" : "Booked"}
          </div>
          <div className="mono text-lg">
            {wallTime(new Date(booked.start_at), me.timezone, true)} {me.city} /{" "}
            {wallTime(new Date(booked.start_at), partner.timezone, true)} {partner.city}
          </div>
        </div>
      ) : null}
      <section aria-labelledby="steps" className="flex flex-col gap-2">
        <h2 id="steps" className="m-0 text-lg font-bold">
          How it goes
        </h2>
        <ol className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
          {steps.map((s, i) => {
            const on = checked.includes(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChecked(on ? checked.filter((x) => x !== i) : [...checked, i])}
                  className="text-text hover:bg-s2 flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent p-3.5 text-left text-base transition-colors"
                >
                  <span
                    className="mono border-line flex h-7 w-7 flex-none items-center justify-center rounded-full border text-sm"
                    style={{
                      background: on ? "var(--accent)" : "transparent",
                      color: on ? "var(--on-accent)" : "var(--accent)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      textDecoration: on ? "line-through" : "none",
                      color: on ? "var(--text-muted)" : "var(--text)",
                    }}
                  >
                    {s}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <section aria-labelledby="prompts" className="flex flex-col gap-2">
        <h2 id="prompts" className="m-0 text-lg font-bold">
          Things to ask each other
        </h2>
        <div className="rounded-card border-line bg-s1 divide-line flex flex-col divide-y border">
          {prompts.map((p, i) => (
            <p key={i} className="display m-0 p-4 text-[20px] leading-[1.2] tracking-normal">
              {p}
            </p>
          ))}
        </div>
      </section>
      {kit.playlist_url && (
        <a
          href={kit.playlist_url}
          target="_blank"
          rel="noopener noreferrer"
          className="press border-line bg-s2 text-text hover:text-text flex h-12 items-center gap-2 self-start rounded-full border px-5 text-sm font-medium"
        >
          <MusicNotes size={18} aria-hidden /> Open the playlist
        </a>
      )}
      {!booked && (
        <Button className="mt-2" onClick={() => setOpen(true)}>
          Schedule it
        </Button>
      )}
      <ScheduleSheet kitId={kit.id} title={kit.title} open={open} onOpenChange={setOpen} />
    </div>
  );
}
