"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { DateField } from "@/components/ui/pickers";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { supabaseBrowser } from "@/lib/supabase/client";
import { localParts } from "@/lib/time";
import { useCouple } from "@/features/couple/context";

/**
 * Keep a photo from the chat: it goes on your shared timeline in Keep, with a
 * name and the day it happened (the day it was sent, unless you change it).
 */
export function AddToKeepSheet({
  open,
  onOpenChange,
  mediaIds,
  sentAt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mediaIds: string[];
  sentAt: string;
}) {
  const { coupleId, me } = useCouple();
  const qc = useQueryClient();
  const today = localParts(new Date(), me.timezone).dateKey;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => localParts(new Date(sentAt), me.timezone).dateKey);
  const [pick, setPick] = useState(mediaIds[0] ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!pick) return;
    setBusy(true);
    const { error } = await supabaseBrowser()
      .from("timeline_entries")
      .insert({
        couple_id: coupleId,
        kind: "manual",
        title: title.trim() || "From our chat",
        happened_on: date || today,
        media_id: pick,
        created_by: me.id,
      });
    setBusy(false);
    if (error) return toast.err("Couldn't add that to Keep. Try again.");
    void qc.invalidateQueries({ queryKey: ["keep", coupleId] });
    onOpenChange(false);
    toast("Added to Keep. It's on your timeline.");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add to Keep" handle>
      <div className="text-lg font-bold">Add to Keep</div>
      <p className="text-muted m-0 text-sm">It goes on your timeline in Keep, for both of you.</p>
      {mediaIds.length > 1 && (
        <div role="radiogroup" aria-label="Which photo" className="grid grid-cols-4 gap-2">
          {mediaIds.map((id, i) => {
            const on = id === pick;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`Photo ${i + 1}`}
                onClick={() => setPick(id)}
                className={cn(
                  "press rounded-thumb relative aspect-square cursor-pointer overflow-hidden border-2 p-0",
                  on ? "border-accent" : "border-transparent opacity-70",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${id}/view`} alt="" className="h-full w-full object-cover" />
                {on && (
                  <span className="bg-accent text-on-accent absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full">
                    <Check size={12} weight="bold" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div>
        <Label htmlFor="keep-title">Name it</Label>
        <Input
          id="keep-title"
          value={title}
          maxLength={120}
          placeholder="From our chat"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="keep-date">When</Label>
        <DateField id="keep-date" value={date} max={today} onChange={setDate} />
      </div>
      <Button loading={busy} softDisabled={!pick} onClick={save}>
        Add to Keep
      </Button>
    </Sheet>
  );
}
