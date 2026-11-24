"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Handshake } from "@phosphor-icons/react";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { boardScores, type BoardState } from "../engines/boards";
import type { OwareBoard } from "../engines/board/oware";
import type { FourUpBoard } from "../engines/board/fourup";
import { sizeOf, type DraughtsBoard } from "../engines/board/draughts";
import { waited } from "../board-line";
import { NudgeButton } from "./nudge";
import { HowToPlay } from "./how-to-play";
import { endingLine } from "../board-copy";
import { GameRecord } from "../record";
import { RoomHeader, sendMove, FinalScore, BackToLobby, type GameRow } from "./shared";
import { DraughtsView, FourUpView, OwareView, useBoardSounds, type Sides } from "./board-views";

/** Oware, Four Up and Draughts against your partner, a turn at a time. */
export function BoardRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const now = useCoupleNow();
  const qc = useQueryClient();
  const s = game.state as BoardState;
  const mySeat = (s.seats[me.id] ?? 0) as 0 | 1;
  const active = game.status === "active";
  const myTurn = active && game.current_turn_user === me.id;
  const [busy, setBusy] = useState(false);
  useBoardSounds(s.kind, s.board);
  const sides: Sides = {
    mine: `var(--partner-${me.role})`,
    theirs: `var(--partner-${partner.role})`,
  };

  async function send(move: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    await sendMove(game.id, move);
    await qc.invalidateQueries({ queryKey: ["game", game.id] });
    setBusy(false);
  }

  const scores = boardScores(s);
  const mine = scores[me.id] ?? 0;
  const theirs = scores[partner.id] ?? 0;
  const unit = s.kind === "oware" ? "seeds captured" : s.kind === "draughts" ? "pieces left" : null;
  const lastByThem = s.last && s.last.by === partner.id ? s.last : null;
  const counter =
    s.kind === "draughts"
      ? `${sizeOf((s.board as DraughtsBoard).board)} by ${sizeOf((s.board as DraughtsBoard).board)}`
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <RoomHeader type={game.type} counter={counter} />
      {game.status === "finished" ? (
        <>
          <FinalScore
            game={game}
            mine={s.kind === "fourup" ? (game.winner_id === me.id ? 1 : 0) : mine}
            theirs={s.kind === "fourup" ? (game.winner_id === partner.id ? 1 : 0) : theirs}
          />
          {!(s as { forfeitBy?: string }).forfeitBy && (
            <p className="text-muted m-0 -mt-1 text-base">
              {endingLine(
                s.kind,
                s.board,
                mySeat,
                game.winner_id ? ((s.seats[game.winner_id] ?? 0) as 0 | 1) : null,
                partner.name,
                s.reason,
              )}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1" role="status" aria-live="polite">
          <div
            className={cn("display text-[30px] leading-tight", myTurn ? "text-text" : "text-muted")}
          >
            {myTurn ? "Your move" : `${partner.name}'s move`}
          </div>
          <div className="text-muted text-sm">
            {lastByThem?.captured
              ? `${partner.name} captured ${lastByThem.captured}. `
              : s.last?.by === me.id && s.last.captured
                ? `You captured ${s.last.captured}. `
                : ""}
            {myTurn
              ? `Waiting on you for ${waited(s.lastMoveAt, now)}.`
              : `Sent ${waited(s.lastMoveAt, now)} ago. Take your time.`}
          </div>
        </div>
      )}

      {active && s.drawOffer === partner.id && (
        <div
          role="alert"
          className="an-pop border-accent/40 bg-accent/10 rounded-card flex flex-wrap items-center gap-3 border p-3"
        >
          <Handshake size={22} className="text-accent flex-none" aria-hidden />
          <span className="min-w-0 flex-1 text-sm font-medium">{partner.name} offers a draw.</span>
          <div className="flex gap-2">
            <Button size="sm" loading={busy} onClick={() => send({ acceptDraw: true })}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => send({ declineDraw: true })}>
              Keep playing
            </Button>
          </div>
        </div>
      )}

      <div className={cn(busy && "pointer-events-none opacity-80")}>
        {s.kind === "oware" ? (
          <OwareView
            board={s.board as OwareBoard}
            mySeat={mySeat}
            canPlay={myTurn}
            sides={sides}
            theirName={partner.name}
            lastPit={(s.board as OwareBoard).history.at(-1)}
            onPlay={(pit) => send({ pit })}
          />
        ) : s.kind === "fourup" ? (
          <FourUpView
            board={s.board as FourUpBoard}
            mySeat={mySeat}
            canPlay={myTurn}
            sides={sides}
            onPlay={(col) => send({ col })}
          />
        ) : (
          <DraughtsView
            board={s.board as DraughtsBoard}
            mySeat={mySeat}
            canPlay={myTurn}
            sides={sides}
            onPlay={(path) => send({ path })}
          />
        )}
      </div>

      {active && <GameRecord type={game.type} />}
      {unit && game.status !== "finished" && (
        <div className="text-muted flex justify-between text-sm" aria-label="Score">
          <span>
            You <span className="mono text-text">{mine}</span>
          </span>
          <span className="text-faint">{unit}</span>
          <span>
            <span className="mono text-text">{theirs}</span> {partner.name}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <HowToPlay kind={s.kind} />
        {active && !s.drawOffer && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => send({ offerDraw: true })}
          >
            <Handshake size={16} aria-hidden /> Offer a draw
          </Button>
        )}
      </div>
      {active && !myTurn && <NudgeButton gameId={game.id} updatedAt={game.updated_at} />}
      {active && s.drawOffer === me.id && (
        <p className="text-muted m-0 text-sm">
          You offered a draw. {partner.name} can accept or play on.
        </p>
      )}
      {game.status === "finished" && <BackToLobby />}
    </div>
  );
}
