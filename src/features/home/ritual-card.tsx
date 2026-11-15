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
      const [{ data: prompt }, { data: answers }, { data: partnerDone }] = await Promise.all([
        sb.from("ritual_prompts").select("id, text").eq("id", promptId).maybeSingle(),
        sb.from("ritual_answers").select("user_id, answer").eq("day", day),
        sb.rpc("ritual_partner_answered", { p_day: day }),
      ]);
      return { prompt, answers: answers ?? [], partnerDone: Boolean(partnerDone) };
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

  async function submit() {
    if (!data?.prompt || !text.trim()) return;
    const { error } = await supabaseBrowser().from("ritual_answers").insert({
      couple_id: coupleId,
      day,
      user_id: me.id,
      prompt_id: data.prompt.id,
      answer: text.trim(),
    });
    if (error) return toast.err("Couldn't save that. Try again.");
    setOpen(false);
    send("ritual.answered", {});
    void qc.invalidateQueries({ queryKey: ["ritual", coupleId, day] });
  }

  return (
    <section
      aria-labelledby="ritual-h"
      className="rounded-card border-line bg-s1 flex flex-none flex-col gap-3 border px-4 py-5"
    >
      <div className="text-muted text-sm font-medium">Today&apos;s ritual, {when}</div>
      <h2 id="ritual-h" className="display m-0 text-[22px] leading-[1.15]">
        {data?.prompt?.text ?? " "}
      </h2>
      {mine && theirs ? (
        <div className="an-reveal grid grid-cols-2 gap-1.5">
          <div className="bg-s2 flex flex-col gap-2 rounded-[14px] p-3.5">
            <span className="text-muted flex items-center gap-1.5 text-xs font-semibold">
              <PartnerMark who="a" /> You
            </span>
            <span className="text-base leading-[1.4]">{mine.answer}</span>
          </div>
          <div className="bg-s2 flex flex-col gap-2 rounded-[14px] p-3.5">
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
