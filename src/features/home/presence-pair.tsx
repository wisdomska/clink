"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { PencilSimple } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { statusLabel, type PresenceStatus } from "@/features/couple/types";
import { feedback } from "@/lib/feedback";
import { useAmbient } from "./ambient";
import { useOpenPartner } from "@/features/partner/partner-sheet";

const STATUSES: Array<{ key: PresenceStatus; emoji: string }> = [
  { key: "free", emoji: "🌿" },
  { key: "studying", emoji: "📚" },
  { key: "cooking", emoji: "🍳" },
  { key: "working", emoji: "💻" },
  { key: "sleeping", emoji: "😴" },
];
const SUGGESTIONS = [
  "at the gym",
  "on the train",
  "thinking of you",
  "in a meeting",
  "out with friends",
];

function ago(iso: string | null, now: Date): string {
  if (!iso) return "away";
  const m = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "away";
  if (m < 60) return `away · ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `away · ${h} h` : "away";
}

function emojiFor(s: string) {
  return STATUSES.find((x) => x.key === s)?.emoji ?? (s.startsWith("custom:") ? "💬" : "");
}

/**
 * The Us hero (HOME-04): both of you, big, side by side on a soft glow. A
 * heartbeat line between you pulses when you're both here and goes flat and
 * dim when one of you is away. Tap yourself to set a status, or write your own.
 */
export function PresencePair({ now }: { now: Date }) {
  const { me, partner, presence, myStatus, setMyStatus } = useCouple();
  const [open, setOpen] = useState(false);
  const [beHere, setBeHere] = useState(false);
  const [custom, setCustom] = useState(myStatus.startsWith("custom:") ? statusLabel(myStatus) : "");
  const ambient = useAmbient();
  const openPartner = useOpenPartner();
  const online = presence.online;
  const asleep = presence.status === "sleeping";
  const theirStatus = asleep
    ? "asleep"
    : online
      ? statusLabel(presence.status)
      : ago(presence.lastSeen, now);

  const pill = (text: string, emoji: string, live: boolean) => (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-1 text-xs font-semibold",
        live ? "bg-white/10 text-white" : "bg-black/20 text-white/60",
      )}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      <span className="truncate">{text}</span>
    </span>
  );

  return (
    <>
      <section
        aria-label="You two"
        className="relative flex-none overflow-hidden rounded-[30px] px-4 pt-5 pb-4"
        style={{
          background:
            "radial-gradient(90% 80% at 15% 0%, color-mix(in oklab, var(--partner-a) 30%, transparent), transparent 60%), radial-gradient(90% 80% at 85% 100%, color-mix(in oklab, var(--partner-b) 24%, transparent), transparent 60%), linear-gradient(160deg, var(--surface-2), var(--surface-1))",
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="press flex min-w-0 cursor-pointer flex-col items-center gap-2 border-0 bg-transparent text-white"
            aria-label={`You, ${statusLabel(myStatus)}. Change your status`}
          >
            <motion.div whileHover={{ rotate: -4, scale: 1.04 }} className="relative">
              <Avatar
                name={me.name}
                side="me"
                size={84}
                ring={0}
                photoUrl={me.avatarUrl}
                icon={me.avatarIcon}
              />
              <span className="bg-accent text-on-accent absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full shadow-md">
                <PencilSimple size={14} weight="bold" aria-hidden />
              </span>
            </motion.div>
            <span className="text-[15px] font-bold">You</span>
            {pill(
              beHere ? "just here" : statusLabel(myStatus),
              beHere ? "✨" : emojiFor(myStatus),
              true,
            )}
          </button>

          {/* Heartbeat between you: pulses together, flat line when apart. */}
          <svg viewBox="0 0 80 32" className="h-8 w-16 sm:w-20" aria-hidden>
            <motion.path
              d={online ? "M0 16 H22 L28 6 L34 26 L40 10 L45 20 L50 16 H80" : "M0 16 H80"}
              fill="none"
              stroke={online ? "var(--accent)" : "var(--text-faint)"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0.01 }}
              animate={
                online
                  ? { pathLength: [0.01, 1, 1], opacity: [1, 1, 0.35] }
                  : { pathLength: 1, opacity: 0.5 }
              }
              transition={
                online ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }
              }
            />
          </svg>

          <button
            type="button"
            onClick={openPartner}
            aria-label={`${partner.name}'s profile`}
            className="press flex min-w-0 cursor-pointer flex-col items-center gap-2 border-0 bg-transparent p-0 text-white"
          >
            <div className="relative">
              <Avatar
                name={partner.name}
                side="partner"
                size={84}
                ring={0}
                photoUrl={partner.avatarUrl}
                icon={partner.avatarIcon}
                dim={!online}
              />
              {online && (
                <span
                  aria-hidden
                  className="an-dot absolute right-1 bottom-1 h-4 w-4 rounded-full bg-[#34C759] shadow-[0_0_0_3px_var(--surface-2)]"
                />
              )}
            </div>
            <span className="max-w-full truncate text-[15px] font-bold">{partner.name}</span>
            {pill(
              theirStatus,
              online && !asleep ? emojiFor(presence.status) : asleep ? "😴" : "",
              online,
            )}
          </button>
        </div>
      </section>

      <Sheet open={open} onOpenChange={setOpen} title="Your status" handle>
        <Display as="h2" size={28}>
          What are you <em>up to</em>?
        </Display>
        <p className="text-muted m-0 text-sm">{partner.name} sees this beside your face on Us.</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
          {STATUSES.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={myStatus === key}
              onClick={() => {
                feedback("select");
                setMyStatus(key);
              }}
              className={cn(
                "press flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 px-4 text-sm font-semibold capitalize",
                myStatus === key ? "bg-accent text-on-accent" : "bg-s2 text-text",
              )}
            >
              <span aria-hidden>{emoji}</span>
              {key}
            </button>
          ))}
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = custom.trim().slice(0, 40);
            if (!t) return;
            feedback("success");
            setMyStatus(`custom:${t}`);
            setOpen(false);
          }}
        >
          <label htmlFor="custom-status" className="text-muted text-sm font-medium">
            Or write your own
          </label>
          <div className="flex gap-2">
            <input
              id="custom-status"
              maxLength={40}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. stuck in traffic"
              className="rounded-input bg-s2 text-text h-11 min-w-0 flex-1 border-0 px-3.5 text-base"
            />
            <Button type="submit" size="sm" disabled={!custom.trim()}>
              Set
            </Button>
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setCustom(sug)}
                className="bg-s2 text-muted hover:text-text flex-none cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-medium"
              >
                {sug}
              </button>
            ))}
          </div>
        </form>
        <div className="rounded-card border-line bg-s2 overflow-hidden border">
          <Toggle
            label="Just be here"
            sub="A quiet live dot, nothing to answer."
            checked={beHere}
            onChange={setBeHere}
          />
          <Toggle
            label="Ambient sound"
            sub="Soft room noise on this device. Off by default."
            checked={ambient.on}
            onChange={ambient.toggle}
            last
          />
        </div>
      </Sheet>
    </>
  );
}
