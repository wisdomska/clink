"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { Input, Label, Textarea, FieldError } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { countdownParts, zonedToUtc, localParts } from "@/lib/time";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { useCountdowns, formatTarget } from "./countdown-card";
import { SplitFlap, EmptyBoard } from "./split-flap";
import { DateField, TimeField } from "@/components/ui/pickers";

export function CountdownsScreen() {
  const { me, coupleId } = useCouple();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data = [], isLoading } = useCountdowns();
  const [open, setOpen] = useState(params.get("new") === "1");
  const now = useCoupleNow(30_000);
  const [title, setTitle] = useState("Next visit");
  const [subtitle, setSubtitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = data.filter((c) => new Date(c.target_at!) > now);
  const reached = data.filter((c) => new Date(c.target_at!) <= now);

  type Row = (typeof data)[number];
  const key = ["countdowns", coupleId];

  /**
   * Validate on the spot, then close the sheet and put the countdown on the
   * board straight away; the insert runs behind it. A failed save takes the
   * card back off and reopens the sheet with the reason.
   */
  async function save() {
    setError(null);
    if (!title.trim() || !date) return setError("Give it a name and a date.");
    const target = zonedToUtc(date, time, me.timezone);
    if (target <= new Date()) return setError("Pick a moment in the future.");
    const row = {
      couple_id: coupleId,
      created_by: me.id,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      target_at: target.toISOString(),
      reveal_note: note.trim() || null,
    };
    const prev = qc.getQueryData<Row[]>(key);
    const tempId = `pending-${target.getTime()}`;
    void qc.cancelQueries({ queryKey: key });
    qc.setQueryData<Row[]>(key, (rows) =>
      [
        ...(rows ?? []),
        { ...row, id: tempId, reveal_note: null, has_note: Boolean(row.reveal_note) } as Row,
      ].sort((a, b) => Date.parse(a.target_at!) - Date.parse(b.target_at!)),
    );
    setOpen(false);
    toast("On the board. The flip starts now.");
    const { error } = await supabaseBrowser().from("countdowns").insert(row);
    if (error) {
      qc.setQueryData(key, prev);
      setOpen(true);
      return setError(
        error.message.includes("5 countdowns")
          ? "You can keep up to 5 countdowns."
          : "Couldn't save that.",
      );
    }
    setNote("");
    void qc.invalidateQueries({ queryKey: key });
  }

  /**
   * No confirm dialog: the card goes at once and an Undo toast holds the
   * delete for 5 s. It only reaches the server once the toast has gone.
   */
  function remove(c: Row) {
    const prev = qc.getQueryData<Row[]>(key);
    void qc.cancelQueries({ queryKey: key });
    qc.setQueryData<Row[]>(key, (rows) => (rows ?? []).filter((r) => r.id !== c.id));
    let undone = false;
    toast(`${c.title} removed.`, {
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          qc.setQueryData(key, prev);
        },
      },
      onDismiss: () => {
        if (undone) return;
        void supabaseBrowser()
          .from("countdowns")
          .delete()
          .eq("id", c.id!)
          .then(({ error }) => {
            if (error) {
              toast.err("Couldn't remove that. It's back on the board.");
              void qc.invalidateQueries({ queryKey: key });
            }
          });
      },
    });
  }

  const pad = (n: number) => String(Math.min(n, 99)).padStart(2, "0");
  const minDate = localParts(new Date(), me.timezone).dateKey;

  return (
    <div
      className={cn(
        "screen screen-medium an-screen flex flex-col gap-5",
        !isLoading && data.length === 0 && "screen-fill",
      )}
    >
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/us")}>
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={36} className="flex-1">
          Countdowns
        </Display>
        <Button size="sm" disabled={active.length >= 5} onClick={() => setOpen(true)}>
          <Plus size={20} aria-hidden /> Add
        </Button>
      </div>
      <Lead>Up to 5 at a time. A note can flip over when one hits zero.</Lead>
      {isLoading ? (
        <div className="an-skel rounded-card bg-s2 h-40" />
      ) : data.length === 0 ? (
        <div className="fill-center rounded-card border-line bg-s1 mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 border p-6 text-center">
          <EmptyBoard />
          <p className="text-muted m-0 text-base">
            Nothing on the board yet. Add your next visit and we&apos;ll start the flip.
          </p>
          <Button size="md" onClick={() => setOpen(true)}>
            <Plus size={20} aria-hidden /> Add a countdown
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...active, ...reached].map((c, i) => {
            const p = countdownParts(now, new Date(c.target_at!));
            return (
              <article
                key={c.id}
                className="an-rise rounded-card border-line bg-s1 flex flex-col gap-3.5 border p-4"
                style={{ ["--i" as string]: i }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="m-0 text-lg font-bold">{c.title}</h2>
                    {c.subtitle && <div className="text-muted mt-0.5 text-sm">{c.subtitle}</div>}
                  </div>
                  <IconButton label={`Remove ${c.title}`} dim={40} onClick={() => remove(c)}>
                    <Trash size={20} />
                  </IconButton>
                </div>
                <SplitFlap
                  size="md"
                  groups={[
                    { value: pad(p.days), label: "DAYS" },
                    { value: pad(p.hours), label: "HRS" },
                    { value: pad(p.minutes), label: "MIN" },
                  ]}
                />
                {p.done ? (
                  c.reveal_note ? (
                    <p className="an-reveal rounded-input bg-s2 m-0 p-3 text-base leading-normal">
                      {c.reveal_note}
                    </p>
                  ) : (
                    <p className="text-muted m-0 text-sm">It&apos;s here.</p>
                  )
                ) : (
                  <div className="text-muted text-sm">
                    {formatTarget(c.target_at!, me.timezone, me.city || "your")}.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="New countdown" handle>
        <Display as="h2" size={28}>
          What are we counting to?
        </Display>
        <div>
          <Label htmlFor="cd-title">Name</Label>
          <Input
            id="cd-title"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="cd-sub">Board line (optional)</Label>
          <Input
            id="cd-sub"
            value={subtitle}
            maxLength={60}
            placeholder="ACC → LHR · GATE 2"
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <div>
            <Label htmlFor="cd-date">Date</Label>
            <DateField id="cd-date" min={minDate} value={date} onChange={setDate} />
          </div>
          <div>
            <Label htmlFor="cd-time">Your time</Label>
            <TimeField id="cd-time" value={time} onChange={setTime} />
          </div>
        </div>
        <div>
          <Label htmlFor="cd-note">Note that flips over at zero (optional)</Label>
          <Textarea
            id="cd-note"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Stays sealed until the board hits zero."
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button onClick={save}>Put it on the board</Button>
      </Sheet>
    </div>
  );
}
