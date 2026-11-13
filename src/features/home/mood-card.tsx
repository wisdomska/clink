"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { PartnerMark } from "@/components/ui/heading";
import { localParts } from "@/lib/time";
import { toast } from "@/components/ui/toast";

export const MOODS = ["Cosy", "Missing you", "Wired", "Tired", "Flirty", "Low"] as const;

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
      toast("Couldn't send that. Try again.");
      return;
    }
    send("mood.set", {});
    void qc.invalidateQueries({ queryKey: ["moods", coupleId] });
  }

  return (
    <section
      aria-labelledby="mood-h"
      className="rounded-card border-line bg-s1 flex flex-none flex-col gap-3 border p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="mood-h" className="m-0 text-lg font-bold">
          How are you, really?
        </h2>
        <div className="text-faint text-sm">Once a day</div>
      </div>
      {theirs ? (
        <div className="text-muted flex items-center gap-2 text-sm">
          <PartnerMark who="b" />
          {partner.name} is {theirs.mood.toLowerCase()}.{theirs.note ? ` "${theirs.note}"` : ""}
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
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={Boolean(mineToday) && !on}
              onClick={() => choose(m)}
              className="press an-rise bg-s2 relative h-[72px] w-[72px] flex-none cursor-pointer rounded-full p-2 text-center text-[13px] leading-[1.15] font-medium disabled:cursor-default"
              style={{
                ["--i" as string]: i,
                border: on ? "2px solid var(--accent)" : "1px solid var(--line)",
                color: on ? "var(--text)" : "var(--text-muted)",
              }}
            >
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{ inset: "7px 5px 3px 9px", border: "2px solid rgba(173,166,178,.08)" }}
              />
              {m}
            </button>
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
