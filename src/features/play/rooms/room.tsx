"use client";
import { useGame, Waiting } from "./shared";
import { KnowMeRoom, TriviaRoom, WyrRoom } from "./question-rooms";
import { DrawRoom } from "./draw-room";
import { WordRoom, StoryRoom } from "./turn-rooms";
import { RoomHeader } from "./shared";

export function GameRoom({ id }: { id: string }) {
  const { data: game, isLoading, error } = useGame(id);
  return (
    <div className="an-screen mx-auto flex min-h-dvh w-full max-w-[720px] flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      {isLoading && <div className="an-skel mt-12 h-64 rounded-card bg-s2" aria-label="Loading game" />}
      {error && <p className="mt-12 text-muted">That game isn&apos;t here any more.</p>}
      {game &&
        (game.status === "invited" ? (
          <>
            <RoomHeader type={game.type} />
            <Waiting game={game} />
          </>
        ) : game.status === "abandoned" ? (
          <>
            <RoomHeader type={game.type} />
            <p className="text-muted">This invite was replaced by a newer one.</p>
          </>
        ) : game.type === "know_me" ? (
          <KnowMeRoom game={game} />
        ) : game.type === "trivia" ? (
          <TriviaRoom game={game} />
        ) : game.type === "wyr" ? (
          <WyrRoom game={game} />
        ) : game.type === "draw_guess" ? (
          <DrawRoom game={game} />
        ) : game.type === "word" ? (
          <WordRoom game={game} />
        ) : (
          <StoryRoom game={game} />
        ))}
    </div>
  );
}
