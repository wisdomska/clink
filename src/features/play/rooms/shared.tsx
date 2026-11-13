"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IconButton, Button } from "@/components/ui/button";
import { useCouple } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";
import { GAME_META } from "../meta";
import { subscribeAuthed } from "@/lib/realtime";
import type { GameType } from "../engines/types";

export interface GameRow {
  id: string;
  type: GameType;
  mode: string;
  status: string;
  state: unknown;
  created_by: string;
  current_turn_user: string | null;
  winner_id: string | null;
  is_draw: boolean;
  scores: unknown;
  updated_at: string;
}

export function useGame(id: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["game", id],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser()
        .from("games")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as GameRow;
    },
  });
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`game:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` },
        (p) => qc.setQueryData(["game", id], p.new),
      );
    return subscribeAuthed(
      ch,
      (s) => s === "SUBSCRIBED" && void qc.invalidateQueries({ queryKey: ["game", id] }),
    );
  }, [id, qc]);
  return q;
}

export async function sendMove(id: string, move: Record<string, unknown>) {
  const r = await fetch(`/api/games/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ move }),
  });
  const d = await r.json();
  if (!r.ok) {
    toast(d.message ?? "That move didn't go through.");
    return null;
  }
  return d as { correct?: boolean; finished?: boolean };
}

export function RoomHeader({
  type,
  counter,
  progress,
}: {
  type: GameType;
  counter?: string;
  progress?: number;
}) {
  const router = useRouter();
  return (
    <>
      <div className="flex flex-none items-center gap-3">
        <IconButton label="Leave game" onClick={() => router.push("/play")}>
          <X size={20} />
        </IconButton>
        <div className="text-muted flex-1 text-sm font-medium">{GAME_META[type].name}</div>
        {counter && <div className="mono text-base">{counter}</div>}
      </div>
      {progress !== undefined && (
        <div
          className="bg-line h-1 flex-none rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-accent h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </>
  );
}

export function Waiting({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const mineInvite = game.created_by === me.id;
  return (
    <div className="an-reveal flex flex-1 flex-col justify-center gap-4">
      <div className="display text-[36px] leading-[1.05]">
        {mineInvite ? (
          <>
            Waiting on {partner.name}. <em>No rush.</em>
          </>
        ) : (
          <>
            {partner.name} wants to <em>play</em>.
          </>
        )}
      </div>
      <p className="text-muted m-0 text-base">
        {mineInvite
          ? "They've had a nudge. The game starts the moment they join."
          : "Join and it starts for both of you."}
      </p>
      {mineInvite ? (
        <Button
          variant="ghost"
          size="lg"
          className="self-start"
          onClick={() => router.push("/play")}
        >
          Back to the lobby
        </Button>
      ) : (
        <Button
          className="self-start px-8"
          onClick={() => fetch(`/api/games/${game.id}/join`, { method: "POST" })}
        >
          Join
        </Button>
      )}
    </div>
  );
}

export function ResultBars({ type, current }: { type: GameType; current: number }) {
  const { coupleId } = useCouple();
  const { data } = useQuery({
    queryKey: ["history", coupleId, type],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("games")
        .select("state")
        .eq("type", type)
        .eq("status", "finished")
        .order("finished_at", { ascending: false })
        .limit(5);
      return (data ?? []).map((g) => Number((g.state as { score?: number }).score ?? 0)).reverse();
    },
  });
  const bars = (data?.length ? data : [current]).slice(-5);
  return (
    <div
      role="img"
      className="mt-3 flex h-[60px] items-end gap-1.5"
      aria-label={`Last ${bars.length} scores: ${bars.join(", ")}`}
    >
      {bars.map((v, i) => (
        <span
          key={i}
          className="w-5 rounded"
          style={{
            height: `${Math.max(8, v * 10)}%`,
            background: i === bars.length - 1 ? "var(--accent)" : "var(--line)",
          }}
        />
      ))}
      <span className="mono text-faint ml-1.5 text-xs">LAST {bars.length}</span>
    </div>
  );
}
