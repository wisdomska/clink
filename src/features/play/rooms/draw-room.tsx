"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStroke } from "perfect-freehand";
import { Eraser, PaperPlaneRight } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { DRAW_ROUNDS, TURN_SECONDS, type DrawState } from "../engines/turns";
import { RoomHeader, ResultMoment, sendMove, type GameRow } from "./shared";
import { CountUp } from "@/components/fx/count-up";
import { startGame } from "../meta";

type Pt = [number, number, number];
interface Stroke {
  id: string;
  color: string;
  pts: Pt[];
}

const COLORS = ["#FBF3F6", "#FF4F7B", "#B9A4FF", "#FFD08A"];

function pathFromStroke(pts: Pt[], w: number): string {
  const outline = getStroke(
    pts.map(([x, y, p]) => [x * w, y * w, p]),
    { size: 6, thinning: 0.6, smoothing: 0.5, streamline: 0.4 },
  );
  if (!outline.length) return "";
  const d = outline.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]!;
      acc.push(x0!, y0!, (x0! + x1!) / 2, (y0! + y1!) / 2);
      return acc;
    },
    ["M", ...outline[0]!, "Q"],
  );
  return `${d.join(" ")} Z`;
}

/** PLAY-03 Draw and guess. Strokes are normalised (0..1) so any screen size renders them. */
export function DrawRoom({ game }: { game: GameRow }) {
  const { me, partner, send } = useCouple();
  const router = useRouter();
  const s = game.state as DrawState;
  const drawing = s.drawer === me.id && game.status === "active";
  const [word, setWord] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]!);
  const [guess, setGuess] = useState("");
  const [left, setLeft] = useState(TURN_SECONDS);
  const [size, setSize] = useState(320);
  const boxRef = useRef<HTMLDivElement>(null);
  const current = useRef<Stroke | null>(null);
  const outbox = useRef<{ id: string; color: string; pts: Pt[] } | null>(null);
  const turnKey = `${s.turn}-${s.turnStartedAt}`;

  // Fresh canvas and word every turn (adjusting state when the turn changes).
  const [seenTurn, setSeenTurn] = useState(turnKey);
  if (seenTurn !== turnKey) {
    setSeenTurn(turnKey);
    setStrokes([]);
    setWord(null);
    setGuess("");
  }
  useEffect(() => {
    if (s.drawer === me.id && game.status === "active") {
      void fetch(`/api/games/${game.id}/secret`).then(
        async (r) => r.ok && setWord((await r.json()).word),
      );
    }
  }, [turnKey, s.drawer, me.id, game.id, game.status]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Timer; whoever's client sees zero first reports the timeout (server checks).
  useEffect(() => {
    if (game.status !== "active") return;
    const tick = () => {
      const l = Math.max(
        0,
        TURN_SECONDS - Math.floor((Date.now() - new Date(s.turnStartedAt).getTime()) / 1000),
      );
      setLeft(l);
      return l;
    };
    tick();
    const t = setInterval(() => {
      if (tick() === 0) {
        clearInterval(t);
        setTimeout(() => void sendMove(game.id, { timeout: true }), 2500);
      }
    }, 500);
    return () => clearInterval(t);
  }, [turnKey, game.status, game.id, s.turnStartedAt]);

  // Batch outgoing points every 50 ms (spec 13.2 game.canvas).
  useEffect(() => {
    if (!drawing) return;
    const t = setInterval(() => {
      const o = outbox.current;
      if (o && o.pts.length) {
        send("game.canvas", { game: game.id, id: o.id, color: o.color, pts: o.pts });
        outbox.current = { ...o, pts: [] };
      }
    }, 50);
    return () => clearInterval(t);
  }, [drawing, send, game.id]);

  useCoupleEvent(
    "game.canvas",
    useCallback(
      (p: Record<string, unknown>) => {
        if (p.game !== game.id) return;
        if (p.clear) return setStrokes([]);
        const id = String(p.id);
        const pts = p.pts as Pt[];
        setStrokes((all) => {
          const i = all.findIndex((x) => x.id === id);
          if (i < 0) return [...all, { id, color: String(p.color), pts }];
          const copy = all.slice();
          copy[i] = { ...copy[i]!, pts: [...copy[i]!.pts, ...pts] };
          return copy;
        });
      },
      [game.id],
    ),
  );

  function point(e: React.PointerEvent): Pt {
    const r = boxRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width, e.pressure || 0.5];
  }
  function down(e: React.PointerEvent) {
    if (!drawing) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const st = { id: crypto.randomUUID(), color, pts: [point(e)] };
    current.current = st;
    outbox.current = { ...st, pts: [...st.pts] };
    setStrokes((a) => [...a, st]);
  }
  function move(e: React.PointerEvent) {
    const st = current.current;
    if (!st) return;
    const pt = point(e);
    st.pts.push(pt);
    outbox.current?.pts.push(pt);
    setStrokes((a) => a.map((x) => (x.id === st.id ? { ...st, pts: [...st.pts] } : x)));
  }
  function up() {
    current.current = null;
  }

  const myScore = s.scores[me.id] ?? 0;
  const theirScore = s.scores[partner.id] ?? 0;
  const round = Math.floor(s.turn / 2) + 1;
  const last = s.results[s.results.length - 1];

  if (game.status === "finished") {
    return (
      <div className="an-reveal flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center gap-3">
          <ResultMoment gameId={game.id} celebrate={myScore >= theirScore} />
          <div className="mono text-faint text-xs">GAME OVER</div>
          <div className="mono text-[72px] leading-none">
            <CountUp value={myScore} className="text-accent" />
            <span className="text-faint"> : </span>
            <span style={{ color: "var(--partner-b)" }}>
              <CountUp value={theirScore} />
            </span>
          </div>
          <div className="display text-[28px] leading-[1.05]">
            {myScore === theirScore ? (
              <>
                Level. <em>Rematch</em>?
              </>
            ) : myScore > theirScore ? (
              <>
                Artist and <em>mind reader</em>.
              </>
            ) : (
              <>
                {partner.name} takes the <em>easel</em>.
              </>
            )}
          </div>
          <ul className="text-muted m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm">
            {s.results.map((r, i) => (
              <li key={i}>
                {r.drawer === me.id ? "You drew" : `${partner.name} drew`}{" "}
                <span className="text-text">{r.word}</span>
                {r.guessed ? `, guessed in ${r.seconds} s` : ", nobody got it"}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={async () => {
              const id = await startGame("draw_guess").catch(() => null);
              if (id) router.push(`/play/draw_guess/${id}`);
            }}
          >
            Rematch
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push("/play")}>
            Back to the lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RoomHeader
        type="draw_guess"
        live={game.status === "active"}
        counter={`${String(left).padStart(2, "0")} s`}
        progress={left / TURN_SECONDS}
      />
      <div className="text-muted flex items-center justify-between text-sm font-medium">
        <span>
          Round {round} of {DRAW_ROUNDS} · {drawing ? "you draw" : `${partner.name} draws`}
        </span>
        <span className="mono">
          you {myScore} · {partner.name} {theirScore}
        </span>
      </div>
      {last && s.turn > 0 && (
        <div className="text-muted text-sm">
          Last one was <span className="text-text">{last.word}</span>.{" "}
          {last.guessed ? `Got in ${last.seconds} s.` : "Nobody got it."}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {drawing ? (
          <div className="display text-[28px]">
            Draw: <em>{word ?? "..."}</em>
          </div>
        ) : (
          <div
            role="img"
            className="mono text-[28px] tracking-[.3em]"
            aria-label={`${s.lengths[s.turn]} letters`}
          >
            {"_".repeat(s.lengths[s.turn] ?? 4)}
          </div>
        )}
        {drawing && (
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className="h-8 w-8 cursor-pointer rounded-full"
                style={{
                  background: c,
                  border: color === c ? "3px solid var(--text)" : "1px solid var(--line)",
                }}
              />
            ))}
            <IconButton
              label="Clear canvas"
              dim={40}
              onClick={() => {
                setStrokes([]);
                send("game.canvas", { game: game.id, clear: true });
              }}
            >
              <Eraser size={18} />
            </IconButton>
          </div>
        )}
      </div>
      <div
        ref={boxRef}
        className="rounded-card border-line bg-s1 relative aspect-square w-full max-w-[560px] flex-none touch-none self-center overflow-hidden border"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label={drawing ? `Canvas. Draw ${word ?? ""}` : `${partner.name}'s drawing`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          {strokes.map((st) => (
            <path key={st.id} d={pathFromStroke(st.pts, size)} fill={st.color} />
          ))}
        </svg>
        {!strokes.length && (
          <div className="text-faint pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
            {drawing ? "Draw with your finger" : "Watch the canvas"}
          </div>
        )}
      </div>
      {!drawing && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!guess.trim()) return;
            const r = await sendMove(game.id, { guess });
            if (r?.correct === false) toast("Not it. Keep going.");
            setGuess("");
          }}
        >
          <input
            aria-label="Your guess"
            placeholder="Your guess"
            value={guess}
            autoComplete="off"
            onChange={(e) => setGuess(e.target.value)}
            className="rounded-input border-line bg-s2 text-text focus:border-accent h-[52px] min-w-0 flex-1 border px-4 text-base outline-none"
          />
          <IconButton label="Guess" tone="accent" type="submit" dim={52}>
            <PaperPlaneRight size={20} weight="fill" />
          </IconButton>
        </form>
      )}
    </>
  );
}
