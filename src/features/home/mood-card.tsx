"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { PartnerMark } from "@/components/ui/heading";
import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";
import { localParts } from "@/lib/time";
import { toast } from "@/components/ui/toast";

export const MOODS = ["Cosy", "Missing you", "Wired", "Tired", "Flirty", "Low"] as const;
/** How each mood reads after a name: "Senya is missing you", "Theo is feeling cosy". */
const MOOD_PHRASE: Record<string, string> = {
  Cosy: "is feeling cosy",
  "Missing you": "is missing you",
  Wired: "is feeling wired",
  Tired: "is tired",
  Flirty: "is feeling flirty",
  Low: "is feeling low",
};
const MOOD_ART: Record<string, string> = {
  Cosy: "mood-cosy",
  "Missing you": "mood-missing",
  Wired: "mood-wired",
  Tired: "mood-tired",
  Flirty: "mood-flirty",
  Low: "mood-low",
};

/** HOME-05: six coaster chips, optional line, once a day. */
export function MoodCard() {
  const { me, partner, coupleId, send } = useCouple();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const today = localParts(new Date(), me.timezone).dateKey;

  const { data } = useQuery({
    queryKey: ["moods", coupleId],
    queryFn: async () => {
      const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
      const { data } = await supabaseBrowser()
        .from("moods")
        .select("user_id, mood, note, created_at")
        .gt("created_at", since)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  useCoupleEvent("mood.set", () => qc.invalidateQueries({ queryKey: ["moods", coupleId] }));

  const mineToday = data?.find(
    (m) => m.user_id === me.id && localParts(new Date(m.created_at), me.timezone).dateKey === today,
  );
  const theirs = data?.find((m) => m.user_id === partner.id);
  const current = picked ?? mineToday?.mood ?? null;

  async function choose(mood: string) {
    if (mineToday) return;
    setPicked(mood);
    const { error } = await supabaseBrowser()
      .from("moods")
      .insert({ couple_id: coupleId, user_id: me.id, mood, note: note.trim() || null });
    if (error) {
      setPicked(null);
      toast.err("Couldn't send that. Try again.");
      return;
    }
    send("mood.set", {});
    void qc.invalidateQueries({ queryKey: ["moods", coupleId] });
  }

  return (
    <section
      aria-labelledby="mood-h"
      className="border-line bg-s1 flex flex-none flex-col gap-3 rounded-[28px] border p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="mood-h" className="m-0 text-lg font-bold">
          How are you, really?
        </h2>
        <div className="text-faint text-sm">Once a day</div>
      </div>
      {theirs ? (
        <div className="bg-s2 flex items-center gap-3 rounded-2xl p-2.5 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/art/${MOOD_ART[theirs.mood] ?? "mood-cosy"}.webp`}
            alt=""
            aria-hidden
            className="h-10 w-10 flex-none object-contain"
          />
          <span className="text-text min-w-0 text-sm">
            <span className="font-bold">{partner.name}</span>{" "}
            {MOOD_PHRASE[theirs.mood] ?? `is feeling ${theirs.mood.toLowerCase()}`}
            {theirs.note && (
              <span className="text-muted block truncate">&ldquo;{theirs.note}&rdquo;</span>
            )}
          </span>
        </div>
      ) : (
        <div className="text-muted flex items-center gap-2 text-sm">
          <PartnerMark who="b" />
          {partner.name} hasn&apos;t checked in yet.
        </div>
      )}
      <div
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pt-0.5 pb-1"
        role="radiogroup"
        aria-label="Your mood"
      >
        {MOODS.map((m, i) => {
          const on = current === m;
          return (
            <motion.button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={Boolean(mineToday) && !on}
              onClick={() => choose(m)}
              whileTap={{ scale: 0.9, rotate: -6 }}
              animate={on ? { y: [0, -6, 0] } : { y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "an-rise flex w-[76px] flex-none cursor-pointer flex-col items-center gap-1 rounded-[22px] border-0 px-1 pt-2 pb-2 text-center text-[12px] leading-[1.15] font-semibold transition-colors disabled:cursor-default disabled:opacity-40",
                on ? "bg-accent/20 text-text" : "bg-s2 text-muted hover:bg-s3",
              )}
              style={{ ["--i" as string]: i }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/art/${MOOD_ART[m]}.webp`}
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
      {!mineToday && !picked && (
        <input
          aria-label="Add a line (optional)"
          placeholder="Add a line, if you like"
          maxLength={80}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-input border-line bg-s2 text-text focus:border-accent h-11 border px-3.5 text-base outline-none"
        />
      )}
      {(mineToday || picked) && (
        <div className="an-reveal text-accent text-sm font-medium">
          Sent. {partner.name} sees it on Us.
        </div>
      )}
    </section>
  );
}
