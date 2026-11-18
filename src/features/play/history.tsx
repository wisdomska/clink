"use client";
import Link from "@/components/ui/link";
import { useCouple } from "@/features/couple/context";
import { Mono } from "@/components/ui/heading";
import {
  LoadMore,
  SkeletonRows,
  flatItems,
  getPage,
  useCursorList,
} from "@/features/plans/infinite";
import { GAME_META } from "./meta";
import type { GameType } from "./engines/types";
import { EmptyState } from "@/components/ui/empty-state";

interface Finished {
  id: string;
  type: string;
  winner_id: string | null;
  is_draw: boolean;
  finished_at: string;
}

const day = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();

/** PLAY-08: every finished game, newest first, 20 at a time. */
export function GameHistory({ onStart }: { onStart: () => void }) {
  const { me, partner, coupleId } = useCouple();
  const q = useCursorList<Finished>({
    queryKey: ["game-history", coupleId],
    fetchPage: (cursor) => getPage<Finished>("/api/games", cursor),
    staleTime: 30_000,
  });
  const games = flatItems(q.data);

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="history-h">
      <h2 id="history-h" className="m-0 text-lg font-bold">
        Game history
      </h2>
      {q.isPending ? (
        <SkeletonRows count={3} tall />
      ) : games.length ? (
        <>
          <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
            {games.map((g) => {
              const meta = GAME_META[g.type as GameType];
              const result = g.is_draw
                ? "Draw"
                : g.winner_id === me.id
                  ? "You won"
                  : g.winner_id === partner.id
                    ? `${partner.name} won`
                    : "Finished";
              return (
                <li key={g.id}>
                  <Link
                    href={`/play/${g.type}/${g.id}`}
                    className="press text-text hover:text-text hover:bg-s2 flex min-h-16 items-center gap-3 px-4 py-2.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/art/${g.type}.webp`}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="h-10 w-10 flex-none object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold">{meta?.name ?? "Game"}</div>
                      <Mono className="text-muted">{day(g.finished_at)}</Mono>
                    </div>
                    <span
                      className={
                        g.winner_id === me.id
                          ? "text-accent text-sm font-bold"
                          : "text-muted text-sm font-medium"
                      }
                    >
                      {result}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <LoadMore query={q} skeleton={<SkeletonRows count={2} tall />} label="Older games" />
        </>
      ) : q.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted m-0 text-sm">Couldn&apos;t load your games.</p>
          <button
            type="button"
            onClick={() => void q.refetch()}
            className="press border-line text-text flex h-11 cursor-pointer items-center rounded-full border bg-transparent px-4 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : (
        <EmptyState
          art="trophy"
          title="No games finished yet."
          actions={
            <button
              type="button"
              onClick={onStart}
              className="press border-line bg-s2 text-text flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium"
            >
              Play a word game
            </button>
          }
        >
          Finished games land here, with who won. Start one now, it works even when {partner.name}
          &apos;s away.
        </EmptyState>
      )}
    </section>
  );
}
