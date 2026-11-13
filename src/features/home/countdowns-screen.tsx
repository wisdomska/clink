"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { Input, Label, Textarea, FieldError } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { countdownParts, zonedToUtc, localParts } from "@/lib/time";
import { toast } from "@/components/ui/toast";
import { useCountdowns, formatTarget } from "./countdown-card";
import { SplitFlap, EmptyBoard } from "./split-flap";

export function CountdownsScreen() {
  const { me, coupleId } = useCouple();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data = [], isLoading } = useCountdowns();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [now, setNow] = useState(() => new Date());
  const [title, setTitle] = useState("Next visit");
  const [subtitle, setSubtitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const active = data.filter((c) => new Date(c.target_at!) > now);
  const reached = data.filter((c) => new Date(c.target_at!) <= now);

  async function save() {
    setError(null);
    if (!title.trim() || !date) return setError("Give it a name and a date.");
    const target = zonedToUtc(date, time, me.timezone);
    if (target <= new Date()) return setError("Pick a moment in the future.");
    const { error } = await supabaseBrowser().from("countdowns").insert({
      couple_id: coupleId,
      created_by: me.id,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      target_at: target.toISOString(),
      reveal_note: note.trim() || null,
    });
    if (error) return setError(error.message.includes("5 countdowns") ? "You can keep up to 5 countdowns." : "Couldn't save that.");
    setOpen(false);
    setNote("");
    toast("On the board. The flip starts now.");
    void qc.invalidateQueries({ queryKey: ["countdowns", coupleId] });
  }

  async function remove(id: string) {
    await supabaseBrowser().from("countdowns").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["countdowns", coupleId] });
  }

  const pad = (n: number) => String(Math.min(n, 99)).padStart(2, "0");
  const minDate = localParts(new Date(), me.timezone).dateKey;

  return (
    <div className="screen an-screen flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/us")}>
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={36} className="flex-1">
          Countdowns
        </Display>
        <Button size="sm" disabled={active.length >= 5} onClick={() => setOpen(true)}>
          <Plus size={18} aria-hidden /> Add
        </Button>
      </div>
      <Lead>Up to 5 at a time. A note can flip over when one hits zero.</Lead>
      {isLoading ? (
        <div className="an-skel h-40 rounded-card bg-s2" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-s1 p-5">
          <EmptyBoard />
          <p className="m-0 text-base text-muted">Nothing on the board yet. Add your next visit and we&apos;ll start the flip.</p>
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Add a countdown
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...active, ...reached].map((c, i) => {
            const p = countdownParts(now, new Date(c.target_at!));
            return (
              <article key={c.id} className="an-rise flex flex-col gap-3.5 rounded-card border border-line bg-s1 p-4" style={{ ["--i" as string]: i }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="m-0 text-lg font-bold">{c.title}</h2>
                    {c.subtitle && <div className="mono mt-0.5 text-xs tracking-[.06em] text-muted uppercase">{c.subtitle}</div>}
                  </div>
                  <IconButton label={`Remove ${c.title}`} dim={40} onClick={() => remove(c.id!)}>
                    <Trash size={18} />
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
                    <p className="an-reveal m-0 rounded-input bg-s2 p-3 text-base leading-normal">{c.reveal_note}</p>
                  ) : (
                    <p className="m-0 text-sm text-muted">It&apos;s here.</p>
                  )
                ) : (
                  <div className="text-sm text-muted">{formatTarget(c.target_at!, me.timezone, me.city || "your")}.</div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="New countdown" handle>
        <Display as="h2" size={28}>
          What are we <em>counting</em> to?
        </Display>
        <div>
          <Label htmlFor="cd-title">Name</Label>
          <Input id="cd-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cd-sub">Board line (optional)</Label>
          <Input id="cd-sub" value={subtitle} maxLength={60} placeholder="ACC → LHR · GATE 2" onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <div>
            <Label htmlFor="cd-date">Date</Label>
            <Input id="cd-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cd-time">Your time</Label>
            <Input id="cd-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="cd-note">Note that flips over at zero (optional)</Label>
          <Textarea id="cd-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Stays sealed until the board hits zero." />
        </div>
        <FieldError>{error}</FieldError>
        <Button onClick={save}>Put it on the board</Button>
      </Sheet>
    </div>
  );
}
