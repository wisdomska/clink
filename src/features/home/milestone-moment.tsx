"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Confetti as ConfettiIcon } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { localParts } from "@/lib/time";
import { feedback } from "@/lib/feedback";
import { Confetti } from "@/components/fx/confetti";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * When today is a milestone (100 days, an anniversary...), celebrate it once
 * on this device: confetti, a sound, and a card that links to the timeline.
 */
export function MilestoneMoment() {
  const { coupleId, me } = useCouple();
  const today = localParts(new Date(), me.timezone).dateKey;
  const { data } = useQuery({
    queryKey: ["milestone-today", coupleId, today],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("timeline_entries")
        .select("source_key, title")
        .eq("couple_id", coupleId)
        .eq("happened_on", today)
        .or("source_key.like.days-%,source_key.like.anniversary-%")
        .limit(1);
      return data?.[0] ?? null;
    },
    staleTime: 60 * 60 * 1000,
  });
  const [open, setOpen] = useState(false);
  const key = data ? `clink_milestone_${coupleId}_${data.source_key}` : null;

  useEffect(() => {
    if (!key) return;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* still celebrate */
    }
    const t = setTimeout(() => {
      setOpen(true);
      feedback("success", "win");
    }, 600);
    return () => clearTimeout(t);
  }, [key]);

  if (!data) return null;
  return (
    <>
      {open && <Confetti count={48} seed={data.source_key!.length} />}
      <Sheet open={open} onOpenChange={setOpen} title={data.title} handle>
        <ConfettiIcon size={40} className="text-accent" aria-hidden />
        <div className="display text-[32px] leading-[1.05]">{data.title}</div>
        <p className="text-muted m-0 text-base leading-normal">
          It&apos;s on your timeline. Send a clink to mark it.
        </p>
        <Button onClick={() => setOpen(false)}>Lovely</Button>
      </Sheet>
    </>
  );
}
