"use client";
import { useQuery } from "@tanstack/react-query";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { GameType } from "./engines/types";

export type GameRecords = Partial<
  Record<GameType, { mine: number; theirs: number; draws: number }>
>;

/** Head to head, per game, for the two of you. */
export function useGameRecords() {
  return useQuery({
    queryKey: ["game-record"],
    queryFn: async (): Promise<GameRecords> => {
      const { data } = await supabaseBrowser().rpc("game_record");
      const out: GameRecords = {};
      for (const r of data ?? [])
        out[r.type as GameType] = {
          mine: Number(r.mine),
          theirs: Number(r.theirs),
          draws: Number(r.draws),
        };
      return out;
    },
    staleTime: 60_000,
  });
}

/** "You 3 · Theo 2 · 1 draw", or null before your first finished game. */
export function recordLine(
  r: { mine: number; theirs: number; draws: number } | undefined,
  partnerName: string,
) {
  if (!r || r.mine + r.theirs + r.draws === 0) return null;
  const draws = r.draws ? ` · ${r.draws} ${r.draws === 1 ? "draw" : "draws"}` : "";
  return `You ${r.mine} · ${partnerName} ${r.theirs}${draws}`;
}

/** The record for one game, as a quiet line. */
export function GameRecord({ type, className }: { type: GameType; className?: string }) {
  const { partner } = useCouple();
  const { data } = useGameRecords();
  const line = recordLine(data?.[type], partner.name);
  if (!line) return null;
  return (
    <p className={className ?? "text-muted m-0 text-sm"} aria-label={`Head to head: ${line}`}>
      <span className="text-faint">Head to head </span>
      <span className="mono">{line}</span>
    </p>
  );
}
