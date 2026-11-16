"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, X } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { haptic } from "@/lib/feedback";
import { localParts, wallTime, zonedToUtc } from "@/lib/time";
import { newClientId } from "./queue";

export interface Scheduled {
  id: string;
  client_id: string;
  body: string;
  send_at: string;
  reply_to: string | null;
  status: string;
  pending?: boolean;
}

/** Your messages waiting to send (only you can see them), with optimistic schedule/cancel. */
export function useScheduled(sentClientIds: Set<string>) {
  const { coupleId, me } = useCouple();
  const qc = useQueryClient();
  const key = useMemo(() => ["scheduled", coupleId], [coupleId]);
  const q = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Scheduled[]> => {
      const { data, error } = await supabaseBrowser()
        .from("scheduled_messages")
        .select("id, client_id, body, send_at, reply_to, status")
        .eq("couple_id", coupleId)
        .eq("sender_id", me.id)
        .in("status", ["scheduled", "sending"])
        .order("send_at");
      if (error) throw error;
      return data ?? [];
    },
    // While something is waiting, check back so delivered ones drop off.
    refetchInterval: (query) => ((query.state.data?.length ?? 0) > 0 ? 30_000 : false),
  });
  // A delivered message shows up in the chat before the next refetch; hide it here at once.
  const items = useMemo(
    () => (q.data ?? []).filter((s) => !sentClientIds.has(s.client_id)),
    [q.data, sentClientIds],
  );

  async function schedule(body: string, sendAt: Date, replyTo?: string) {
    const clientId = newClientId();
    const prev = qc.getQueryData<Scheduled[]>(key);
    const temp: Scheduled = {
      id: `local-${clientId}`,
      client_id: clientId,
      body,
      send_at: sendAt.toISOString(),
      reply_to: replyTo ?? null,
      status: "scheduled",
      pending: true,
    };
    qc.setQueryData<Scheduled[]>(key, (old) =>
      [...(old ?? []), temp].sort((a, b) => a.send_at.localeCompare(b.send_at)),
    );
    haptic("select");
    const r = await fetch("/api/messages/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, body, sendAt: sendAt.toISOString(), replyTo }),
    });
    if (!r.ok) {
      qc.setQueryData(key, prev);
      toast.err((await r.json().catch(() => ({}))).message ?? "That didn't schedule.");
      return false;
    }
    const { scheduled } = await r.json();
    qc.setQueryData<Scheduled[]>(key, (old) =>
      (old ?? []).map((s) => (s.client_id === clientId ? (scheduled as Scheduled) : s)),
    );
    toast(`Scheduled for ${wallTime(sendAt, me.timezone, true)}.`);
    return true;
  }

  async function cancel(s: Scheduled) {
    const prev = qc.getQueryData<Scheduled[]>(key);
    qc.setQueryData<Scheduled[]>(key, (old) => (old ?? []).filter((x) => x.id !== s.id));
    const r = await fetch(`/api/messages/scheduled/${s.id}`, { method: "DELETE" });
    if (!r.ok) {
      qc.setQueryData(key, prev);
      toast.err((await r.json().catch(() => ({}))).message ?? "That didn't cancel.");
      void qc.invalidateQueries({ queryKey: key });
      return null;
    }
    toast("Cancelled. It won't be sent.");
    return s;
  }

  return { items, schedule, cancel };
}

/** "Send later" picker: quick choices plus any date and time, shown in both time zones. */
export function SendLaterSheet({
  open,
  onOpenChange,
  preview,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preview: string;
  onPick: (at: Date) => void;
}) {
  const { me, partner } = useCouple();
  const now = useCoupleNow(30_000);
  const today = localParts(now, me.timezone).dateKey;
  const tomorrow = localParts(new Date(now.getTime() + 86400000), me.timezone).dateKey;
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("08:00");
  const [error, setError] = useState<string | null>(null);
  const instant = date && time ? zonedToUtc(date, time, me.timezone) : null;
  const tonight = zonedToUtc(today, "21:00", me.timezone);
  const quick = [
    { label: "In 1 hour", at: new Date(Math.ceil((now.getTime() + 3600000) / 60000) * 60000) },
    ...(tonight.getTime() > now.getTime() + 5 * 60000
      ? [{ label: "Tonight, 21:00", at: tonight }]
      : []),
    { label: "Tomorrow, 08:00", at: zonedToUtc(tomorrow, "08:00", me.timezone) },
  ];

  function pick(at: Date | null) {
    setError(null);
    if (!at) return setError("Pick a date and time.");
    if (at.getTime() < now.getTime() + 60_000)
      return setError("Pick a time at least a minute away.");
    onPick(at);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Send later" handle>
      <h2 className="m-0 text-lg font-bold">Send later</h2>
      <p className="text-muted bg-s2 rounded-input m-0 line-clamp-2 px-3.5 py-2.5 text-sm">
        {preview}
      </p>
      <div className="flex flex-col gap-2" role="group" aria-label="Quick times">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => pick(q.at)}
            className="border-line bg-s2 hover:bg-s3 flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-full border px-4 text-left text-sm"
          >
            <span className="text-text font-semibold">{q.label}</span>
            <span className="text-faint text-xs">
              {wallTime(q.at, partner.timezone, true)} for {partner.name}
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <div>
          <Label htmlFor="sl-date">Date</Label>
          <Input
            id="sl-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sl-time">Your time</Label>
          <Input id="sl-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      {instant && (
        <p className="text-muted m-0 text-sm">
          Arrives {wallTime(instant, partner.timezone, true)} for {partner.name}.
        </p>
      )}
      <FieldError>{error}</FieldError>
      <Button onClick={() => pick(instant)}>
        <Clock size={18} aria-hidden />
        Schedule
      </Button>
    </Sheet>
  );
}

/** Slim row above the composer when something is waiting; opens the list. */
export function ScheduledBar({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-line bg-s1 text-muted hover:text-text flex min-h-11 flex-none cursor-pointer items-center gap-2 border-0 border-t px-4 text-left text-sm"
    >
      <Clock size={16} className="text-accent" aria-hidden />
      {count === 1 ? "1 message scheduled" : `${count} messages scheduled`}
    </button>
  );
}

export function ScheduledSheet({
  open,
  onOpenChange,
  items,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: Scheduled[];
  onCancel: (s: Scheduled) => void;
}) {
  const { me, partner } = useCouple();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Scheduled messages" handle>
      <h2 className="m-0 text-lg font-bold">Scheduled messages</h2>
      <p className="text-muted m-0 text-sm">Only you can see these until they send.</p>
      {items.length === 0 ? (
        <p className="text-muted m-0 text-sm">Nothing waiting.</p>
      ) : (
        <ul className="rounded-card border-line bg-s2 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
          {items.map((s) => {
            const at = new Date(s.send_at);
            return (
              <li key={s.id} className="flex items-stretch">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-2.5">
                  <span className="text-faint text-xs">
                    {new Intl.DateTimeFormat("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: me.timezone,
                    }).format(at)}{" "}
                    {wallTime(at, me.timezone)} · {wallTime(at, partner.timezone)} for{" "}
                    {partner.name}
                    {s.status === "sending" ? " · sending" : ""}
                  </span>
                  <span className="text-text line-clamp-2 text-sm">{s.body}</span>
                </div>
                <button
                  type="button"
                  disabled={s.pending || s.status !== "scheduled"}
                  onClick={() => onCancel(s)}
                  aria-label={`Cancel scheduled message: ${s.body}`}
                  className={cn(
                    "text-muted hover:text-text flex w-12 flex-none cursor-pointer items-center justify-center border-0 bg-transparent",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <X size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
