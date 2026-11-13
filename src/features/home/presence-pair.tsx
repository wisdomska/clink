"use client";
import { useState } from "react";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { Display } from "@/components/ui/heading";
import { cn } from "@/components/ui/cn";
import type { PresenceStatus } from "@/features/couple/types";
import { diffLabel } from "@/lib/time";
import { useAmbient } from "./ambient";

const STATUSES: PresenceStatus[] = ["free", "studying", "cooking", "working", "sleeping"];

function ago(iso: string | null): string {
  if (!iso) return "away";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "away";
  if (m < 60) return `away · ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `away · ${h} h` : "away";
}

/** Presence pair (HOME-04): two avatars joined by a thread that glows when both are here and sags when not. */
export function PresencePair({ now }: { now: Date }) {
  const { me, partner, presence, myStatus, setMyStatus } = useCouple();
  const [open, setOpen] = useState(false);
  const [beHere, setBeHere] = useState(false);
  const ambient = useAmbient();
  const online = presence.online;
  const asleep = presence.status === "sleeping";
  const theirStatus = asleep ? "asleep" : online ? presence.status : ago(presence.lastSeen);

  return (
    <>
      <div className="grid flex-none grid-cols-[84px_1fr_84px] items-start">
        <button type="button" onClick={() => setOpen(true)} className="press flex cursor-pointer flex-col items-center gap-1.5 bg-transparent text-text" aria-label={`You, ${myStatus}. Change your status`}>
          <Avatar name={me.name} side="me" photoUrl={me.avatarUrl} icon={me.avatarIcon} />
          <div className="text-center text-sm leading-[1.3] font-medium">
            You
            <br />
            <span className="text-muted">{beHere ? "just here" : myStatus}</span>
          </div>
        </button>
        <div className="relative h-14" aria-hidden>
          {online && !asleep ? (
            <div className="absolute top-[27px] -right-3.5 -left-3.5 h-0.5 rounded-sm bg-accent" style={{ boxShadow: "0 0 10px var(--accent-glow)", transition: "opacity 320ms" }} />
          ) : (
            <div className="absolute top-1.5 -right-3.5 -left-3.5 h-10 border-b-[1.5px] border-faint" style={{ borderRadius: "0 0 50% 50%" }} />
          )}
          <div className="mono absolute top-16 right-0 left-0 text-center text-xs text-faint">{diffLabel(now, me.timezone, partner.timezone)}</div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={partner.name} side="partner" photoUrl={partner.avatarUrl} icon={partner.avatarIcon} dim={!online || asleep}>
            {online && !asleep && <span aria-hidden className="an-dot absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-app bg-accent" />}
          </Avatar>
          <div className="text-center text-sm leading-[1.3] font-medium">
            {partner.name}
            <br />
            <span className="text-muted">{theirStatus}</span>
          </div>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Your status" handle>
        <Display as="h2" size={28}>
          What are you <em>up to</em>?
        </Display>
        <p className="m-0 text-sm text-muted">{partner.name} sees this beside your face on Us.</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={myStatus === s}
              onClick={() => setMyStatus(s)}
              className={cn(
                "press h-11 cursor-pointer rounded-full border px-4 text-sm font-medium capitalize",
                myStatus === s ? "border-accent bg-accent text-on-accent" : "border-line bg-transparent text-text",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-card border border-line bg-s2">
          <Toggle label="Just be here" sub="A quiet live dot, nothing to answer." checked={beHere} onChange={setBeHere} />
          <Toggle label="Ambient sound" sub="Soft room noise on this device. Off by default." checked={ambient.on} onChange={ambient.toggle} last />
        </div>
      </Sheet>
    </>
  );
}
