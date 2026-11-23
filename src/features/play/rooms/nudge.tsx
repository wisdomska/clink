"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRinging } from "@phosphor-icons/react";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { waited } from "../board-line";

/**
 * In a turn-based game, while it's their move: a gentle nudge (a push to
 * them), once per move and only after it has waited 12 hours. Before then it
 * says when you can.
 */
export function NudgeButton({ gameId, updatedAt }: { gameId: string; updatedAt: string }) {
  const { partner } = useCouple();
  const now = useCoupleNow(60_000);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["nudge", gameId, updatedAt],
    queryFn: async () => {
      const r = await fetch(`/api/games/${gameId}/nudge`, { cache: "no-store" });
      if (!r.ok) return null;
      return (await r.json()) as { waiting: boolean; nudged: boolean; from: string };
    },
  });
  if (!data?.waiting) return null;
  if (data.nudged)
    return (
      <p className="text-muted m-0 flex items-center gap-1.5 text-sm" role="status">
        <BellRinging size={16} aria-hidden /> Nudged. {partner.name} will see it.
      </p>
    );
  const early = Date.parse(data.from) > now.getTime();
  if (early)
    return (
      <p className="text-faint m-0 text-sm">
        You can nudge {partner.name} in {waited(now.toISOString(), new Date(data.from))}.
      </p>
    );
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch(`/api/games/${gameId}/nudge`, { method: "POST" });
        const d = await r.json().catch(() => ({}));
        setBusy(false);
        if (!r.ok) return toast.err(d.message ?? "That nudge didn't send.");
        toast.ok(`Nudged ${partner.name}.`);
        await qc.invalidateQueries({ queryKey: ["nudge", gameId] });
      }}
    >
      <BellRinging size={16} aria-hidden /> Nudge {partner.name}
    </Button>
  );
}
