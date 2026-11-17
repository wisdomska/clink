"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChatCircle } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";

/** Every feeling, grouped the way they actually come. */
export const MOOD_GROUPS = [
  { label: "Good", moods: ["Happy", "Loved", "Cosy", "Excited", "Flirty", "Grateful"] },
  { label: "Somewhere between", moods: ["Missing you", "Goofy", "Tired", "Anxious", "Stressed"] },
  { label: "Hard", moods: ["Low", "Sad", "Hurt", "Jealous", "Angry", "Need space"] },
] as const;
export const MOODS = MOOD_GROUPS.flatMap((g) => g.moods);

const ART: Record<string, string> = {
  Happy: "mood-happy",
  Loved: "mood-loved",
  Cosy: "mood-cosy",
  Excited: "mood-excited",
  Flirty: "mood-flirty",
  Grateful: "mood-grateful",
  "Missing you": "mood-missing",
  Goofy: "mood-wired",
  Tired: "mood-tired",
  Anxious: "mood-anxious",
  Stressed: "mood-stressed",
  Low: "mood-low",
  Sad: "mood-sad",
  Hurt: "mood-hurt",
  Jealous: "mood-jealous",
  Angry: "mood-angry",
  "Need space": "mood-space",
};

/** How each mood reads after a name: "Senya is missing you", "Theo is feeling cosy". */
export const PHRASE: Record<string, string> = {
  Happy: "is happy",
  Loved: "is feeling loved",
  Cosy: "is feeling cosy",
  Excited: "is excited",
  Flirty: "is feeling flirty",
  Grateful: "is feeling grateful",
  "Missing you": "is missing you",
  Goofy: "is feeling goofy",
  Tired: "is tired",
  Anxious: "is feeling anxious",
  Stressed: "is stressed",
  Low: "is feeling low",
  Sad: "is sad",
  Hurt: "is hurt",
  Jealous: "is feeling jealous",
  Angry: "is angry",
  "Need space": "needs a little space",
};
/** "Feeling cosy", "Missing you", "Needs space": a mood as a short chip. */
export function moodChip(mood: string): string {
  const p = PHRASE[mood];
  if (!p) return `Feeling ${mood.toLowerCase()}`;
  const t = p.replace(/^is /, "").replace(/^needs a little space$/, "needs space");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** The same moods, said to you: "You're missing them", "You need a little space". */
const MINE: Record<string, string> = {
  Happy: "You're happy",
  Loved: "You're feeling loved",
  Cosy: "You're feeling cosy",
  Excited: "You're excited",
  Flirty: "You're feeling flirty",
  Grateful: "You're feeling grateful",
  "Missing you": "You're missing them",
  Goofy: "You're feeling goofy",
  Tired: "You're tired",
  Anxious: "You're feeling anxious",
  Stressed: "You're stressed",
  Low: "You're feeling low",
  Sad: "You're sad",
  Hurt: "You're hurt",
  Jealous: "You're feeling jealous",
  Angry: "You're angry",
  "Need space": "You need a little space",
};

const HARD = new Set<string>(MOOD_GROUPS[2].moods);

const since = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : "yesterday";
};

/** HOME-05: how you really are, as often as it changes. Optional line. */
export function MoodCard() {
  const { me, partner, coupleId, send } = useCouple();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const { data } = useQuery({
    queryKey: ["moods", coupleId],
    queryFn: async () => {
      const from = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
      const { data } = await supabaseBrowser()
        .from("moods")
        .select("user_id, mood, note, created_at")
        .gt("created_at", from)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  useCoupleEvent("mood.set", () => qc.invalidateQueries({ queryKey: ["moods", coupleId] }));

  const mine = data?.find((m) => m.user_id === me.id);
  const theirs = data?.find((m) => m.user_id === partner.id);
  const choosing = editing || !mine;

  /**
   * Optimistic: your mood shows the moment you tap it, and saves in the
   * background. If the save fails it rolls back and the picker comes back.
   */
  async function choose(mood: string) {
    feedback("select");
    const key = ["moods", coupleId];
    const line = note.trim() || null;
    type Row = NonNullable<typeof data>[number];
    const prev = qc.getQueryData<Row[]>(key);
    const optimistic = {
      user_id: me.id,
      mood,
      note: line,
      created_at: new Date().toISOString(),
    } as Row;
    void qc.cancelQueries({ queryKey: key });
    qc.setQueryData<Row[]>(key, (rows) => [optimistic, ...(rows ?? [])]);
    setEditing(false);
    setNote("");
    const { error } = await supabaseBrowser()
      .from("moods")
      .insert({ couple_id: coupleId, user_id: me.id, mood, note: line });
    if (error) {
      qc.setQueryData(key, prev);
      setEditing(true);
      setNote(line ?? "");
      return toast.err("Couldn't send that. Try again.");
    }
    send("mood.set", {});
    void qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section
      aria-labelledby="mood-h"
      className="border-line bg-s1 rounded-card flex flex-none flex-col gap-3 border p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="mood-h" className="m-0 text-lg font-bold">
          How are you, really?
        </h2>
        <div className="text-faint text-sm">Change it any time</div>
      </div>

      {theirs ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-[14px] p-2.5 pr-3",
            HARD.has(theirs.mood) ? "bg-danger/10" : "bg-s2",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/art/${ART[theirs.mood] ?? "mood-cosy"}.webp`}
            alt=""
            aria-hidden
            className="h-10 w-10 flex-none object-contain"
          />
          <span className="text-text min-w-0 flex-1 text-sm">
            <span className="font-bold">{partner.name}</span>{" "}
            {PHRASE[theirs.mood] ?? `is feeling ${theirs.mood.toLowerCase()}`}
            <span className="text-faint"> · {since(theirs.created_at)}</span>
            {theirs.note && (
              <span className="text-muted block truncate">&ldquo;{theirs.note}&rdquo;</span>
            )}
          </span>
          {HARD.has(theirs.mood) && (
            <Link
              href="/chat"
              className="press bg-accent text-on-accent hover:text-on-accent flex h-11 flex-none items-center gap-1.5 rounded-full px-3.5 text-sm font-bold"
            >
              <ChatCircle size={16} weight="fill" aria-hidden />
              {theirs.mood === "Need space" ? "Send love" : "Talk it out"}
            </Link>
          )}
        </div>
      ) : (
        <div className="text-muted text-sm">{partner.name} hasn&apos;t checked in yet.</div>
      )}

      {!choosing && mine ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/art/${ART[mine.mood] ?? "mood-cosy"}.webp`}
            alt=""
            aria-hidden
            className="h-10 w-10 object-contain"
          />
          <span className="min-w-0 flex-1 text-sm">
            <span className="font-bold">{MINE[mine.mood] ?? mine.mood}</span>
            <span className="text-faint"> · {since(mine.created_at)}</span>
            {mine.note && (
              <span className="text-muted block truncate">&ldquo;{mine.note}&rdquo;</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Change your mood"
            className="press bg-s2 text-text h-11 flex-none cursor-pointer rounded-full border-0 px-4 text-sm font-semibold"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          {MOOD_GROUPS.map((g) => (
            <div key={g.label} className="flex flex-col gap-1.5">
              <div className="text-faint text-xs font-semibold">{g.label}</div>
              <div
                className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pt-0.5 pb-1 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(72px,1fr))] lg:overflow-visible lg:px-0"
                role="radiogroup"
                aria-label={`Your mood: ${g.label}`}
              >
                {g.moods.map((m, i) => {
                  const on = mine?.mood === m;
                  return (
                    <motion.button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => void choose(m)}
                      whileTap={{ scale: 0.97, transition: { duration: 0.06 } }}
                      className={cn(
                        "an-rise flex w-[76px] flex-none cursor-pointer flex-col items-center gap-1 rounded-[14px] border-0 px-1 pt-2 pb-2 text-center text-[12px] leading-[1.15] font-semibold transition-colors lg:w-auto",
                        on
                          ? "bg-accent/10 text-text shadow-[inset_0_0_0_1.5px_var(--accent)]"
                          : "bg-s2 text-muted hover:bg-s3",
                      )}
                      style={{ ["--i" as string]: i }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/art/${ART[m]}.webp`}
                        alt=""
                        aria-hidden
                        draggable={false}
                        className="h-11 w-11 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,.4)]"
                      />
                      {m}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
          <input
            aria-label="Add a line (optional)"
            placeholder="Add a line, if you like"
            maxLength={80}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-input bg-s2 text-text h-11 border-0 px-3.5 text-base"
          />
          {mine && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="press text-muted hover:text-text -ml-1 h-11 cursor-pointer self-start rounded-full border-0 bg-transparent px-1 text-sm"
            >
              Keep &ldquo;{mine.mood}&rdquo;
            </button>
          )}
        </>
      )}
    </section>
  );
}
