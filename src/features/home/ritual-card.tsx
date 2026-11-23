"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/field";
import { PartnerMark, Display } from "@/components/ui/heading";
import { localParts, zonedToUtc, formatClock } from "@/lib/time";
import { toast } from "@/components/ui/toast";
import { feedback } from "@/lib/feedback";

/** HOME-08: one shared prompt a day; both answers reveal together. */
export function RitualCard() {
  const { me, partner, coupleId, ritualTime, send } = useCouple();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const anchor = me.role === "a" ? me : partner; // the couple's day follows partner A's calendar
  const day = localParts(new Date(), anchor.timezone).dateKey;

  const { data } = useQuery({
    queryKey: ["ritual", coupleId, day],
    queryFn: async () => {
      const sb = supabaseBrowser();
      const { count } = await sb
        .from("ritual_prompts")
        .select("id", { count: "exact", head: true });
      const n = count || 1;
      const dayNo = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
      const promptId = (dayNo % n) + 1;
      const [{ data: prompt }, { data: answers }, { data: partnerDone }, { data: streak }] =
        await Promise.all([
          sb.from("ritual_prompts").select("id, text").eq("id", promptId).maybeSingle(),
          sb.from("ritual_answers").select("user_id, answer").eq("day", day),
          sb.rpc("ritual_partner_answered", { p_day: day }),
          sb.rpc("ritual_streak", { p_today: day }),
        ]);
      return {
        prompt,
        answers: answers ?? [],
        partnerDone: Boolean(partnerDone),
        streak: Number(streak ?? 0),
      };
    },
  });
  useCoupleEvent("ritual.answered", () =>
    qc.invalidateQueries({ queryKey: ["ritual", coupleId, day] }),
  );

  const mine = data?.answers.find((a) => a.user_id === me.id);
  const theirs = data?.answers.find((a) => a.user_id === partner.id);
  const ritualInstant = zonedToUtc(day, ritualTime, anchor.timezone);
  const myT = formatClock(ritualInstant, me.timezone);
  const theirT = formatClock(ritualInstant, partner.timezone);
  const when = myT === theirT ? `${myT} for both` : `${myT} for you, ${theirT} for ${partner.name}`;

  /** Close the sheet and show "Yours is in" at once; the save runs behind it. */
  async function submit() {
    if (!data?.prompt || !text.trim()) return;
    const answer = text.trim();
    const key = ["ritual", coupleId, day];
    const prev = qc.getQueryData<typeof data>(key);
    void qc.cancelQueries({ queryKey: key });
    qc.setQueryData<typeof data>(key, (d) =>
      d ? { ...d, answers: [...d.answers, { user_id: me.id, answer }] } : d,
    );
    setOpen(false);
    feedback("send");
    const { error } = await supabaseBrowser().from("ritual_answers").insert({
      couple_id: coupleId,
      day,
      user_id: me.id,
      prompt_id: data.prompt.id,
      answer,
    });
    if (error) {
      qc.setQueryData(key, prev);
      setOpen(true);
      return toast.err("Couldn't save that. Try again.");
    }
    send("ritual.answered", {});
    void qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section
      aria-labelledby="ritual-h"
      className="rounded-card border-line bg-s1 flex flex-none flex-col gap-3 border px-4 py-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-muted text-sm font-medium">Today&apos;s ritual, {when}</div>
        {(data?.streak ?? 0) >= 2 && (
          <div
            className="mono flex-none text-xs text-[var(--champagne)]"
            aria-label={`${data!.streak} days in a row, both of you`}
          >
            {data!.streak} in a row
          </div>
        )}
      </div>
      <h2 id="ritual-h" className="display m-0 text-[22px] leading-[1.15]">
        {data?.prompt?.text ?? " "}
      </h2>
      {mine && theirs ? (
        <div className="an-reveal grid grid-cols-2 gap-1.5">
          <div className="bg-s2 rounded-input flex flex-col gap-2 p-3.5">
            <span className="text-muted flex items-center gap-1.5 text-xs font-semibold">
              <PartnerMark who="a" /> You
            </span>
            <span className="text-base leading-[1.4]">{mine.answer}</span>
          </div>
          <div className="bg-s2 rounded-input flex flex-col gap-2 p-3.5">
            <span className="text-muted flex items-center gap-1.5 text-xs font-semibold">
              <PartnerMark who="b" /> {partner.name}
            </span>
            <span className="text-base leading-[1.4]">{theirs.answer}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted flex items-center gap-2 text-sm">
            <PartnerMark who="b" />
            {mine
              ? `Yours is in. Waiting on ${partner.name}.`
              : data?.partnerDone
                ? `${partner.name} answered. Both reveal together.`
                : "Both reveal together."}
          </div>
          {!mine && (
            <Button size="sm" className="flex-none px-[18px]" onClick={() => setOpen(true)}>
              Answer
            </Button>
          )}
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="Answer today's ritual" handle>
        <Display as="h2" size={22} className="leading-[1.15]">
          {data?.prompt?.text}
        </Display>
        <Textarea
          autoFocus
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Only ${partner.name} sees this, once they answer too.`}
        />
        <Button onClick={submit} disabled={!text.trim()}>
          Seal my answer
        </Button>
      </Sheet>
    </section>
  );
}
