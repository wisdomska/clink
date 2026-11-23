"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Question,
  PencilSimpleLine,
  Lightning,
  ArrowsLeftRight,
  Plus,
} from "@phosphor-icons/react";
import { useCoupleNow, useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PartnerMark } from "@/components/ui/heading";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { GAME_META, startGame } from "./meta";
import { BOARD_TYPES, isBoardType, type BoardState } from "./engines/boards";
import { boardLine } from "./board-line";
import { recordLine, useGameRecords } from "./record";
import { GameTile } from "./game-tile";
import { GameHistory } from "./history";
import { useOpenPartner } from "@/features/partner/partner-sheet";
import { subscribeAuthed } from "@/lib/realtime";
import type { GameType } from "./engines/types";
import { PageBar } from "@/components/clink/page-bar";
import { NavTabs, TabPanel, useTab } from "@/components/ui/nav-tabs";
import { useBadges } from "@/features/couple/badges";

const LIVE: Array<{ type: GameType; Icon: typeof Question }> = [
  { type: "know_me", Icon: Question },
  { type: "draw_guess", Icon: PencilSimpleLine },
  { type: "trivia", Icon: Lightning },
  { type: "wyr", Icon: ArrowsLeftRight },
];

const PLAY_TABS = [
  { value: "games", label: "Games" },
  { value: "history", label: "History" },
] as const;

const PHOTO: GameType[] = ["rps", "snap", "zoom", "memory"];

export function useGames() {
  const { coupleId } = useCouple();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["games", coupleId],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("games")
        .select(
          "id, type, mode, status, created_by, current_turn_user, state, winner_id, updated_at, finished_at",
        )
        .in("status", ["invited", "active"])
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`games:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `couple_id=eq.${coupleId}` },
        (e) => {
          void qc.invalidateQueries({ queryKey: ["games", coupleId] });
          // A game just finished: refresh the history and the lifetime score.
          if ((e.new as { status?: string } | null)?.status === "finished") {
            void qc.invalidateQueries({ queryKey: ["game-history", coupleId] });
            void qc.invalidateQueries({ queryKey: ["rivalry"] });
          }
        },
      );
    return subscribeAuthed(
      ch,
      (status) =>
        status === "SUBSCRIBED" && void qc.invalidateQueries({ queryKey: ["games", coupleId] }),
    );
  }, [coupleId, qc]);
  return q;
}

export function Lobby() {
  const { me, partner, presence, send } = useCouple();
  const now = useCoupleNow(60_000);
  const { data: records } = useGameRecords();
  const openPartner = useOpenPartner();
  const router = useRouter();
  const { data: games = [] } = useGames();
  const [deckOpen, setDeckOpen] = useState(false);
  const tab = useTab(PLAY_TABS);
  const waiting = useBadges().play;
  const { data: rivalry } = useQuery({
    queryKey: ["rivalry"],
    queryFn: async () => (await supabaseBrowser().rpc("game_rivalry")).data ?? [],
  });
  const mine = Number(rivalry?.find((r) => r.user_id === me.id)?.wins ?? 0);
  const theirs = Number(rivalry?.find((r) => r.user_id === partner.id)?.wins ?? 0);
  const lead =
    mine === theirs
      ? mine
        ? "Dead level. Settle it."
        : "No wins yet. Someone has to go first."
      : mine > theirs
        ? "You lead. For now."
        : `${partner.name} leads. For now.`;
  const online = presence.online;
  const invites = games.filter((g) => g.status === "invited");
  const turnGames = games.filter((g) => g.mode === "turn");

  async function play(type: GameType, extra: Record<string, unknown> = {}) {
    const invitedByThem = invites.find((g) => g.type === type && g.created_by === partner.id);
    if (invitedByThem) {
      await fetch(`/api/games/${invitedByThem.id}/join`, { method: "POST" });
      router.push(`/play/${type}/${invitedByThem.id}`);
      return;
    }
    if (GAME_META[type].mode === "live" && !online) {
      toast(`${partner.name}'s away. Try a turn-based game.`);
      return;
    }
    try {
      const id = await startGame(type, extra);
      send("game.invite", { id, type });
      toast(`${GAME_META[type].name} invite sent. Waiting on ${partner.name}.`);
      router.push(`/play/${type}/${id}`);
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't start that.");
    }
  }

  return (
    <div className="screen an-screen flex flex-col gap-5">
      <PageBar title="Play together" />
      <section
        aria-label="Lifetime score"
        className="rounded-card border-line bg-s1 flex flex-none flex-col gap-2.5 border p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartnerMark who={me.role} size={12} />
            <span className="text-base font-medium">You</span>
            <span className="mono text-[28px]">{mine}</span>
          </div>
          <div className="text-faint text-xs">Lifetime</div>
          <div className="flex items-center gap-2">
            <span className="mono text-[28px]">{theirs}</span>
            <button
              type="button"
              onClick={openPartner}
              className="text-text min-h-11 cursor-pointer border-0 bg-transparent p-0 text-base font-medium hover:underline"
            >
              {partner.name}
            </button>
            <PartnerMark who={partner.role} size={12} />
          </div>
        </div>
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <span style={{ flex: Math.max(mine, 1), background: `var(--partner-${me.role})` }} />
          <span
            style={{ flex: Math.max(theirs, 1), background: `var(--partner-${partner.role})` }}
          />
        </div>
        <div className="text-muted text-sm">{lead}</div>
      </section>
      <NavTabs
        label="Play sections"
        tabs={[
          { value: "games", label: "Games", count: waiting || undefined },
          { value: "history", label: "History" },
        ]}
      />
      {tab === "games" && (
        <TabPanel key="games">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] 2xl:gap-14">
            <div className="flex min-w-0 flex-col gap-5">
              {online ? (
                <div className="flex items-center gap-2 text-base font-medium">
                  <span className="an-dot bg-accent h-2 w-2 rounded-full" aria-hidden />
                  {partner.name}&apos;s here. Live games are open.
                </div>
              ) : (
                <div className="text-muted flex items-center gap-2 text-base font-medium">
                  <span className="border-faint h-2 w-2 rounded-full border-[1.5px]" aria-hidden />
                  {partner.name}&apos;s away. Turn-based games work any time.
                </div>
              )}

              {invites
                .filter((g) => g.created_by === partner.id)
                .map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => play(g.type as GameType)}
                    className="press an-reveal rounded-card border-accent bg-s1 text-text flex cursor-pointer items-center gap-3 border-2 px-4 py-3.5 text-left"
                  >
                    <span className="flex-1 text-base font-bold">
                      {partner.name} invited you to {GAME_META[g.type as GameType].name}
                    </span>
                    <span className="bg-accent text-on-accent rounded-full px-3 py-1.5 text-[13px] font-bold">
                      Join
                    </span>
                  </button>
                ))}

              <div className="grid grid-cols-2 gap-3 pb-5">
                {LIVE.map(({ type }, i) => {
                  const pending = invites.some((g) => g.type === type && g.created_by === me.id);
                  const meta = GAME_META[type];
                  return (
                    <GameTile
                      key={type}
                      type={type}
                      index={i}
                      hero={i === 0 || (i === LIVE.length - 1 && i % 2 === 1)}
                      name={meta.name}
                      meta={online ? meta.meta : "Needs you both"}
                      dim={!online}
                      highlight={pending}
                      badge={pending ? "Invite sent" : undefined}
                      onClick={() => (type === "wyr" ? setDeckOpen(true) : play(type))}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="m-0 text-lg font-bold">Play with photos</h2>
              <div className="grid grid-cols-2 gap-3 pb-5 md:grid-cols-4 lg:grid-cols-2">
                {PHOTO.map((type, i) => {
                  const pending = invites.some((g) => g.type === type && g.created_by === me.id);
                  const meta = GAME_META[type];
                  return (
                    <GameTile
                      key={type}
                      type={type}
                      index={i + LIVE.length}
                      name={meta.name}
                      meta={online ? meta.meta : "Needs you both"}
                      dim={!online}
                      highlight={pending}
                      badge={pending ? "Invite sent" : undefined}
                      onClick={() => play(type)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="m-0 text-lg font-bold">Turn by turn, any time</h2>
              <div className="flex flex-col gap-2">
                {turnGames.map((g) => {
                  const yourTurn = g.current_turn_user === me.id;
                  const st = g.state as {
                    scores?: Record<string, number>;
                    plays?: unknown[];
                    lines?: Array<{ text: string }>;
                  };
                  const board = isBoardType(g.type) ? (g.state as unknown as BoardState) : null;
                  const sub = board
                    ? boardLine(board, me.id, partner.name, now)
                    : g.type === "word"
                      ? `Turn ${(st.plays?.length ?? 0) + 1} of 16 · ${(st.scores?.[me.id] ?? 0) === (st.scores?.[partner.id] ?? 0) ? `level at ${st.scores?.[me.id] ?? 0}` : `${(st.scores?.[me.id] ?? 0) > (st.scores?.[partner.id] ?? 0) ? "you lead" : `${partner.name} leads`} ${st.scores?.[me.id] ?? 0} to ${st.scores?.[partner.id] ?? 0}`}`
                      : `Line ${(st.lines?.length ?? 0) + 1} of 40${st.lines?.length ? ` · "${st.lines[st.lines.length - 1]!.text.slice(0, 24)}"` : ""}`;
                  return (
                    <Link
                      key={g.id}
                      href={`/play/${g.type}/${g.id}`}
                      className="press rounded-card border-line bg-s1 text-text hover:text-text flex items-center gap-3 border px-4 py-3.5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/art/${g.type}.webp`}
                        alt=""
                        aria-hidden
                        className="h-10 w-10 flex-none object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold">
                          {GAME_META[g.type as GameType].name}
                        </div>
                        <div className="text-muted truncate text-sm">{sub}</div>
                      </div>
                      {yourTurn ? (
                        <span className="bg-accent text-on-accent rounded-full px-3 py-1.5 text-[13px] font-bold">
                          Your turn
                        </span>
                      ) : (
                        <span className="border-line text-muted rounded-full border px-3 py-1.5 text-[13px] font-medium">
                          Their turn
                        </span>
                      )}
                    </Link>
                  );
                })}
                {BOARD_TYPES.map((type) => (
                  <div
                    key={type}
                    className="rounded-card border-line flex items-center gap-3 border border-dashed px-4 py-2.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/art/${type}.webp`}
                      alt=""
                      aria-hidden
                      className="h-10 w-10 flex-none object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold">{GAME_META[type].name}</div>
                      <div className="text-muted truncate text-sm">
                        {recordLine(records?.[type], partner.name) ?? GAME_META[type].meta}
                      </div>
                    </div>
                    <Link
                      href={`/play/${type}/practice`}
                      className="press text-muted hover:text-text flex h-11 items-center rounded-full px-3 text-sm font-semibold"
                      aria-label={`Practise ${GAME_META[type].name} against Clink`}
                    >
                      Practise
                    </Link>
                    <button
                      type="button"
                      onClick={() => play(type)}
                      aria-label={`Start ${GAME_META[type].name} with ${partner.name}`}
                      className="press bg-accent text-on-accent flex h-11 cursor-pointer items-center gap-1 rounded-full border-0 px-4 text-sm font-bold"
                    >
                      <Plus size={16} weight="bold" aria-hidden /> Play
                    </button>
                  </div>
                ))}
                {!turnGames.some((g) => g.type === "word") && (
                  <button
                    type="button"
                    onClick={() => play("word")}
                    className="press rounded-card border-line text-text flex cursor-pointer items-center gap-3 border border-dashed bg-transparent px-4 py-3.5 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/art/word.webp"
                      alt=""
                      aria-hidden
                      className="h-10 w-10 flex-none object-contain"
                    />
                    <span className="flex-1 text-base font-bold">Start a word game</span>
                    <Plus size={18} className="text-accent" aria-hidden />
                  </button>
                )}
                {!turnGames.some((g) => g.type === "story") && (
                  <button
                    type="button"
                    onClick={() => play("story")}
                    className="press rounded-card border-line text-text flex cursor-pointer items-center gap-3 border border-dashed bg-transparent px-4 py-3.5 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/art/story.webp"
                      alt=""
                      aria-hidden
                      className="h-10 w-10 flex-none object-contain"
                    />
                    <span className="flex-1 text-base font-bold">Start a story</span>
                    <Plus size={18} className="text-accent" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        </TabPanel>
      )}
      {tab === "history" && (
        <TabPanel key="history" className="mx-auto w-full max-w-[880px]">
          <GameHistory onStart={() => void play("word")} />
        </TabPanel>
      )}
      <Sheet open={deckOpen} onOpenChange={setDeckOpen} title="Pick a deck" handle>
        <div className="display text-[28px]">Pick a deck</div>
        <div className="grid grid-cols-2 gap-2">
          {(["Silly", "Deep", "Future", "Travel"] as const).map((d) => (
            <Button
              key={d}
              variant="secondary"
              size="lg"
              onClick={() => {
                setDeckOpen(false);
                void play("wyr", { deck: d });
              }}
            >
              {d}
            </Button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
