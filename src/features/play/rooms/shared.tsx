"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IconButton, Button } from "@/components/ui/button";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { GAME_META } from "../meta";
import { subscribeAuthed } from "@/lib/realtime";
import { feedback } from "@/lib/feedback";
import { Confetti } from "@/components/fx/confetti";
import type { GameType } from "../engines/types";

export interface GameRow {
  id: string;
  type: GameType;
  mode: string;
  status: string;
  state: unknown;
  created_by: string;
  created_at: string;
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
    // Safety net: realtime can drop an event on a flaky connection. While the
    // game is live, re-check every few seconds so nobody is left waiting.
    refetchInterval: (query) => (query.state.data?.status === "active" ? 4000 : false),
  });
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`game:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` },
        (p) =>
          // Events can arrive out of order; never replace newer state with older.
          qc.setQueryData<GameRow>(["game", id], (cur) => {
            const next = p.new as GameRow;
            return cur && cur.updated_at > next.updated_at ? cur : next;
          }),
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
    toast.err(d.message ?? "That move didn't go through.");
    return null;
  }
  return d as { correct?: boolean; finished?: boolean };
}

export function RoomHeader({
  type,
  counter,
  progress,
  live = false,
}: {
  type: GameType;
  counter?: string;
  progress?: number;
  /** A live round in progress: leaving (button or back gesture) asks first. */
  live?: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  // Back-gesture guard: one extra history entry while live; going back asks first.
  useEffect(() => {
    if (!live) return;
    history.pushState({ clinkGuard: true }, "");
    const onPop = () => {
      if (!liveRef.current) return;
      history.pushState({ clinkGuard: true }, "");
      setConfirm(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [live]);

  const leave = () => {
    liveRef.current = false;
    router.push("/play");
  };

  return (
    <>
      <div className="flex flex-none items-center gap-3">
        <IconButton label="Leave game" onClick={() => (live ? setConfirm(true) : leave())}>
          <X size={20} />
        </IconButton>
        <div className="text-muted flex-1 text-sm font-medium">{GAME_META[type].name}</div>
        {counter && <div className="mono text-base">{counter}</div>}
      </div>
      {progress !== undefined && (
        <div
          className="bg-line h-1 flex-none overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-accent h-full w-full origin-left rounded-full transition-transform duration-300"
            style={{
              transform: `scaleX(${progress})`,
              transitionTimingFunction: "var(--ease-out)",
            }}
          />
        </div>
      )}
      <Sheet open={confirm} onOpenChange={setConfirm} title="Leave the game?" handle>
        <div className="display text-[28px] leading-[1.05]">
          Leave <em>mid-round</em>?
        </div>
        <p className="text-muted m-0 text-base leading-normal">
          The game stays open, so you can come back to it from Play.
        </p>
        <Button onClick={() => setConfirm(false)}>Keep playing</Button>
        <Button variant="ghost" size="lg" onClick={leave}>
          Leave for now
        </Button>
      </Sheet>
    </>
  );
}

function Elapsed({ since }: { since: string }) {
  const now = useCoupleNow(1000);
  const secs = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  return (
    <span
      className="mono text-faint text-sm"
      aria-label={`Waiting ${m} minutes ${secs % 60} seconds`}
    >
      {String(m).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
    </span>
  );
}

export function Waiting({ game }: { game: GameRow }) {
  const { me, partner, presence, send } = useCouple();
  const router = useRouter();
  const mineInvite = game.created_by === me.id;
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <div className="an-reveal flex flex-1 flex-col justify-center gap-5">
      <div className="flex items-center gap-4">
        <span className="relative flex-none">
          <span
            aria-hidden
            className={presence.online ? "an-pulse absolute inset-0 rounded-full" : "hidden"}
          />
          <Avatar
            name={partner.name}
            side="partner"
            size={56}
            photoUrl={partner.avatarUrl}
            icon={partner.avatarIcon}
            dim={!presence.online}
          />
        </span>
        <div className="flex flex-col">
          <span className="text-base font-medium">
            {presence.online ? `${partner.name} is on Clink` : `${partner.name} is away`}
          </span>
          {mineInvite && <Elapsed since={game.created_at} />}
        </div>
      </div>
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="lg"
            softDisabled={cooldown > 0}
            onClick={() => {
              if (cooldown > 0) return toast(`Give them a moment. Nudge again in ${cooldown}s.`);
              send("game.invite", { id: game.id, type: game.type });
              feedback("send", "send");
              toast.ok(`Nudged ${partner.name}.`);
              setCooldown(20);
            }}
          >
            {cooldown > 0 ? `Nudge again in ${cooldown}s` : `Nudge ${partner.name}`}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push("/play")}>
            Back to the lobby
          </Button>
        </div>
      ) : (
        <Button
          className="self-start px-8"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            feedback("success", "pop");
            await fetch(`/api/games/${game.id}/join`, { method: "POST" });
            setBusy(false);
          }}
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
          className="an-bar w-5 origin-bottom rounded"
          style={{
            height: `${Math.max(8, v * 10)}%`,
            background: i === bars.length - 1 ? "var(--accent)" : "var(--line)",
            ["--i" as string]: i,
          }}
        />
      ))}
      <span className="mono text-faint ml-1.5 text-xs">LAST {bars.length}</span>
    </div>
  );
}

/**
 * The end-of-game moment: confetti when it went well, a sound and a haptic,
 * once per finished game per tab (reopening a finished game stays calm).
 */
export function ResultMoment({ gameId, celebrate }: { gameId: string; celebrate: boolean }) {
  const [first] = useState(() => {
    try {
      const key = `clink_celebrated_${gameId}`;
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, "1");
      return true;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!first) return;
    if (celebrate) feedback("success", "win");
    else feedback("tap", "pop");
  }, [first, celebrate]);
  return first && celebrate ? <Confetti seed={gameId.charCodeAt(0) + gameId.length} /> : null;
}

/** A sound and a haptic each time a new answer is revealed: warm when it went well. */
export function useRevealFeedback(key: string | null, good: boolean) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!key || key === last.current) return;
    last.current = key;
    if (good) feedback("success", "success");
    else feedback("tap", "pop");
  }, [key, good]);
}
