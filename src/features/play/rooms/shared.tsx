"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Crown, Flag } from "@phosphor-icons/react";
import { CountUp } from "@/components/fx/count-up";
import { cn } from "@/components/ui/cn";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IconButton, Button } from "@/components/ui/button";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { GAME_META } from "../meta";
import { GameRecord } from "../record";
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
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { id } = useParams<{ id?: string }>();
  // The room already loaded the game; read it from the cache, no extra fetch.
  const { data: game } = useQuery<GameRow>({ queryKey: ["game", id], enabled: false });
  const active = game?.status === "active";
  const [confirm, setConfirm] = useState(false);
  const [quitting, setQuitting] = useState(false);
  // Forfeit is a second step: tapping it by mistake only asks, never ends the game.
  const [sure, setSure] = useState(false);
  const openSheet = (v: boolean) => {
    setConfirm(v);
    if (!v) setSure(false);
  };
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
        <IconButton label="Leave game" onClick={() => (live || active ? openSheet(true) : leave())}>
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
      <Sheet
        open={confirm}
        onOpenChange={openSheet}
        title={sure ? "Forfeit this game?" : "Leave the game?"}
        handle
      >
        {sure ? (
          <div role="alertdialog" aria-labelledby="forfeit-h" className="flex flex-col gap-3">
            <div id="forfeit-h" className="display text-[28px] leading-[1.05]">
              Forfeit this game?
            </div>
            <p className="text-muted m-0 text-base leading-normal">
              It ends now for both of you and {partner.name} takes the win. You can&apos;t undo
              this.
            </p>
            <Button
              variant="danger"
              loading={quitting}
              onClick={async () => {
                setQuitting(true);
                const r = await fetch(`/api/games/${id}/forfeit`, { method: "POST" });
                setQuitting(false);
                if (!r.ok) {
                  const d = await r.json().catch(() => ({}));
                  return toast.err(d.message ?? "Couldn't forfeit. Try again.");
                }
                liveRef.current = false;
                openSheet(false);
                feedback("tap", "pop");
                await qc.invalidateQueries({ queryKey: ["game", id] });
              }}
            >
              <Flag size={18} weight="bold" aria-hidden /> Yes, forfeit
            </Button>
            <Button variant="ghost" size="lg" onClick={() => openSheet(false)}>
              No, keep playing
            </Button>
          </div>
        ) : (
          <>
            <div className="display text-[28px] leading-[1.05]">Leave the game?</div>
            <p className="text-muted m-0 text-base leading-normal">
              Leave for now and it stays open, so you can come back from Play. Forfeit and it ends
              here, with {partner.name} taking the win.
            </p>
            <Button onClick={() => openSheet(false)}>Keep playing</Button>
            <Button variant="ghost" size="lg" onClick={leave}>
              Leave for now
            </Button>
            {active && (
              <Button variant="danger-outline" size="lg" onClick={() => setSure(true)}>
                <Flag size={18} weight="bold" aria-hidden /> Forfeit, {partner.name} wins
              </Button>
            )}
          </>
        )}
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
      aria-label={`Waiting ${m} ${m === 1 ? "minute" : "minutes"} ${secs % 60} ${secs % 60 === 1 ? "second" : "seconds"}`}
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
        {mineInvite ? <>Waiting on {partner.name}. No rush.</> : <>{partner.name} wants to play.</>}
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
      <span className="mono text-faint ml-1.5 text-xs">Last {bars.length}</span>
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

/** Who quit, if the game ended that way. */
export function useForfeit(game: GameRow): { by: string; mine: boolean; name: string } | null {
  const { me, partner } = useCouple();
  const by = (game.state as { forfeitBy?: string } | null)?.forfeitBy;
  if (!by) return null;
  return { by, mine: by === me.id, name: by === me.id ? "You" : partner.name };
}

/**
 * The final score with names on it: who won, by how much, and whether
 * someone forfeited. Each side wears its partner colour.
 */
export function FinalScore({
  game,
  mine,
  theirs,
  kicker = "Game over",
}: {
  game: GameRow;
  mine: number;
  theirs: number;
  kicker?: string;
}) {
  const { me, partner } = useCouple();
  const forfeit = useForfeit(game);
  const qc = useQueryClient();
  // This game just counted: fetch the head-to-head fresh.
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["game-record"] });
  }, [qc, game.id]);
  const iWon = game.winner_id ? game.winner_id === me.id : mine > theirs;
  const draw = !game.winner_id && (game.is_draw || mine === theirs);
  const headline = draw ? "It's a draw." : iWon ? "You win!" : `${partner.name} wins!`;
  const side = (who: "me" | "them") => {
    const isMe = who === "me";
    const won = !draw && (isMe ? iWon : !iWon);
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span
          className={cn(
            "flex max-w-full items-center gap-1.5 truncate text-base font-bold",
            won ? "text-text" : "text-muted",
          )}
        >
          {won && (
            <Crown
              size={18}
              weight="fill"
              className="flex-none text-[var(--champagne)]"
              aria-hidden
            />
          )}
          {isMe ? "You" : partner.name}
        </span>
        <span
          className="mono text-[64px] leading-none"
          style={{ color: `var(--partner-${isMe ? me.role : partner.role})` }}
        >
          <CountUp value={isMe ? mine : theirs} />
        </span>
        {won && (
          <span className="mono text-[11px] tracking-[.12em] text-[var(--champagne)] uppercase">
            Winner
          </span>
        )}
      </div>
    );
  };
  return (
    <section aria-label="Final score" className="flex flex-col gap-3">
      <div className="mono text-faint text-xs uppercase">{kicker}</div>
      <div className="display text-[36px] leading-[1.05]" role="status">
        {headline}
      </div>
      {forfeit && (
        <p className="text-muted m-0 text-base">
          {forfeit.mine ? "You forfeited." : `${forfeit.name} forfeited.`}
        </p>
      )}
      <div className="border-line bg-s1 rounded-card flex items-center gap-2 border px-3 py-5">
        {side("me")}
        <span className="mono text-faint text-[28px]" aria-hidden>
          :
        </span>
        {side("them")}
      </div>
      <span className="sr-only">
        You {mine}, {partner.name} {theirs}.
      </span>
      <GameRecord type={game.type} />
    </section>
  );
}

/** "Theo forfeited." on games without a scoreboard (story, would you rather, know me). */
export function ForfeitNote({ game }: { game: GameRow }) {
  const f = useForfeit(game);
  if (!f) return null;
  return (
    <p className="text-muted m-0 flex items-center gap-1.5 text-base" role="status">
      <Flag size={16} weight="bold" aria-hidden />
      {f.mine ? "You forfeited this one." : `${f.name} forfeited this one.`}
    </p>
  );
}

/** Every finished game offers a way back to the games. */
export function BackToLobby() {
  const router = useRouter();
  return (
    <Button variant="ghost" size="lg" onClick={() => router.push("/play")}>
      Back to the lobby
    </Button>
  );
}

/**
 * After a game: if your partner has already started the next one of the same
 * game, say so with a one-tap Join, instead of leaving you on the old result.
 */
export function RematchInvite({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const { data: next } = useQuery({
    queryKey: ["rematch", game.id],
    enabled: game.status === "finished",
    refetchInterval: 4000,
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("games")
        .select("id, type, created_by, status")
        .eq("type", game.type)
        .in("status", ["invited", "active"])
        .gt("created_at", game.created_at)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });
  if (!next) return null;
  const theirs = next.created_by !== me.id;
  return (
    <div
      role="status"
      className="an-pop border-accent/40 bg-accent/10 rounded-card flex items-center gap-3 border p-3"
    >
      <span className="min-w-0 flex-1 text-sm font-medium">
        {theirs
          ? `${partner.name} started a rematch.`
          : "You started a rematch. It's waiting for you."}
      </span>
      <Button size="sm" onClick={() => router.push(`/play/${next.type}/${next.id}`)}>
        {theirs ? "Join" : "Go"}
      </Button>
    </div>
  );
}
